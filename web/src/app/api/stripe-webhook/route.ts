import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// This is your Stripe secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any, // use latest compatible
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get the user ID we passed into the checkout session metadata
      const userId = session.client_reference_id;
      const stripeCustomerId = session.customer as string;
      
      if (userId) {
        // Update user in Supabase securely bypassing RLS
        await supabaseAdmin
          .from('users')
          .update({ 
            subscription_tier: 'pro',
            stripe_customer_id: stripeCustomerId
          })
          .eq('id', userId);
        
        console.log(`Successfully upgraded user ${userId} to Pro!`);
      }
      break;
      
    case 'customer.subscription.deleted':
      // Handle cancellations
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin
          .from('users')
          .update({ subscription_tier: 'free' })
          .eq('stripe_customer_id', subscription.customer as string);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
