document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const commitInput = document.getElementById('commit-input');
    const generateBtn = document.getElementById('generate-btn');
    const tryExampleBtn = document.getElementById('try-example-btn');
    const toneBtns = document.querySelectorAll('.tone-btn:not(.opacity-50)'); // Exclude pro button
    
    // States
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const outputState = document.getElementById('output-state');
    const diffContainer = document.querySelector('.diff-container');
    
    // Output Elements
    const outputTabs = document.querySelectorAll('.output-tab');
    const outputContents = document.querySelectorAll('.output-content');
    const copyBtn = document.getElementById('copy-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const toast = document.getElementById('toast');
    const charCounter = document.getElementById('char-counter');
    
    // Mock Data
    const exampleCommits = "feat(auth): implement magic link login\nfix(api): resolve race condition in webhook processing\nrefactor: migrate dashboard to React Server Components\nchore: drop support for IE11";

    const mockOutput = {
        twitter: "Just shipped a massive update to the core platform!\n\n1/ No more passwords. We've rolled out Magic Link login for seamless, secure access.\n\n2/ The dashboard is now blazingly fast. We rewrote it using React Server Components, cutting load times by 60%.\n\n3/ Also fixed that pesky webhook race condition causing double-fires.\n\nIt's live now. Try it out!",
        linkedin: "Excited to announce our latest product update focused on speed and security.\n\nWe've officially deprecated passwords in favor of Magic Links, reducing login friction for all users. Under the hood, we completely rebuilt our dashboard infrastructure using React Server Components.\n\nEngineering team crushed it this week fixing some complex webhook race conditions too. Onwards!",
        changelog: "### Features\n- **Authentication**: Introduced Magic Link login, removing the need for passwords.\n\n### Improvements\n- **Performance**: Dashboard migrated to React Server Components for significantly faster page loads.\n- **Maintenance**: Officially dropped support for Internet Explorer 11.\n\n### Bug Fixes\n- **API**: Resolved a race condition in the webhook processor that could cause duplicate events.",
        email: "Hi there,\n\nWe've just rolled out a major update to make your experience faster and more secure.\n\nFirst, we're saying goodbye to passwords. You can now log in seamlessly using Magic Links sent directly to your email.\n\nSecond, if you notice the dashboard feels much snappier today, that's because we completely rebuilt the underlying architecture to cut load times by over half.\n\nLog in and check it out!\n\nBest,\nThe Engineering Team"
    };

    let currentTone = 'hype';

    // --- Input Handling & Validation ---
    
    const validateInput = () => {
        if (commitInput.value.trim().length > 0) {
            generateBtn.removeAttribute('disabled');
        } else {
            generateBtn.setAttribute('disabled', 'true');
        }
    };

    commitInput.addEventListener('input', validateInput);

    tryExampleBtn.addEventListener('click', () => {
        commitInput.value = exampleCommits;
        validateInput();
        // Visual feedback
        commitInput.classList.add('ring-2', 'ring-emerald-500');
        setTimeout(() => commitInput.classList.remove('ring-2', 'ring-emerald-500'), 500);
    });

    // Tone Selection
    toneBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toneBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTone = e.target.dataset.tone;
        });
    });

    // --- Generation & Animation (The Signature Moment) ---

    const startGeneration = async () => {
        if (generateBtn.disabled) return;
        
        // UI Reset
        emptyState.style.opacity = '0';
        outputState.style.opacity = '0';
        document.getElementById('output-actions').classList.add('hidden');
        
        // Disable button during generation
        generateBtn.setAttribute('disabled', 'true');
        const originalBtnHtml = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span>Generating...</span>';

        setTimeout(() => {
            emptyState.classList.add('hidden');
            outputState.classList.add('hidden');
            loadingState.classList.remove('hidden');
            diffContainer.innerHTML = ''; // clear previous
        }, 300);

        try {
            // Fetch real data from backend
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commits: commitInput.value, tone: currentTone })
            });
            
            if (!response.ok) throw new Error('Generation failed');
            const data = await response.json();
            
            // Sequence the animation now that we have data
            const oldLines = commitInput.value.split('\n').filter(l => l.trim().length > 0).slice(0, 5); 
            const newLines = data.twitter.split('\n').filter(l => l.trim().length > 0).slice(0, 3);
            
            let delay = 500;
            
            // 1. Show old commits being removed
            oldLines.forEach((line, index) => {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.className = 'diff-line removed';
                    el.innerHTML = `
                        <span class="diff-line-number">${index + 1}</span>
                        <span class="diff-sign">-</span>
                        <span class="truncate">${escapeHtml(line)}</span>
                    `;
                    diffContainer.appendChild(el);
                }, delay);
                delay += 400;
            });

            // 2. Pause
            delay += 600;

            // 3. Show new marketing copy being added
            newLines.forEach((line, index) => {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.className = 'diff-line added';
                    el.innerHTML = `
                        <span class="diff-line-number">${oldLines.length + index + 1}</span>
                        <span class="diff-sign">+</span>
                        <span class="truncate">${escapeHtml(line)}</span>
                    `;
                    diffContainer.appendChild(el);
                }, delay);
                delay += 500;
            });

            // 4. Finish and reveal output
            delay += 800;
            setTimeout(() => {
                loadingState.classList.add('hidden');
                outputState.classList.remove('hidden');
                document.getElementById('output-actions').classList.remove('hidden');
                document.getElementById('output-actions').classList.add('flex');
                
                // Trigger reflow
                void outputState.offsetWidth; 
                outputState.style.opacity = '1';
                
                // Populate textareas with REAL data
                document.getElementById('tab-twitter').value = data.twitter;
                document.getElementById('tab-linkedin').value = data.linkedin;
                document.getElementById('tab-changelog').value = data.changelog;
                document.getElementById('tab-email').value = data.email;
                
                updateCharCounter();
                
                // Restore button
                generateBtn.removeAttribute('disabled');
                generateBtn.innerHTML = originalBtnHtml;
            }, delay);

        } catch (error) {
            console.error("Error:", error);
            diffContainer.innerHTML = `<div class="text-diffRedText p-4">Error connecting to AI. Make sure the server is running.</div>`;
            setTimeout(() => {
                generateBtn.removeAttribute('disabled');
                generateBtn.innerHTML = originalBtnHtml;
            }, 1000);
        }
    };

    generateBtn.addEventListener('click', startGeneration);
    regenerateBtn.addEventListener('click', startGeneration);

    // Keyboard shortcut (Cmd/Ctrl + Enter)
    commitInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            startGeneration();
        }
    });

    // --- Tabs & Output Interaction ---

    outputTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Update active tab style
            outputTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            // Show target textarea
            const targetId = e.target.dataset.target;
            outputContents.forEach(content => {
                if(content.id === targetId) {
                    content.classList.remove('hidden');
                    content.classList.add('active');
                } else {
                    content.classList.add('hidden');
                    content.classList.remove('active');
                }
            });

            // Toggle character counter visibility
            if (targetId === 'tab-twitter') {
                charCounter.style.display = 'block';
                updateCharCounter();
            } else {
                charCounter.style.display = 'none';
            }
        });
    });

    const updateCharCounter = () => {
        const twitterText = document.getElementById('tab-twitter').value;
        // Split thread by double newline to evaluate individual tweets
        const tweets = twitterText.split('\n\n');
        const longestTweetCount = tweets.length > 0 ? Math.max(...tweets.map(t => t.length)) : 0;
        
        charCounter.textContent = `Max Tweet: ${longestTweetCount}/280`;
        if (longestTweetCount > 280) {
            charCounter.classList.add('text-diffRedText');
            charCounter.classList.remove('text-zinc-500');
        } else {
            charCounter.classList.remove('text-diffRedText');
            charCounter.classList.add('text-zinc-500');
        }
    };

    document.getElementById('tab-twitter').addEventListener('input', updateCharCounter);

    // Copy to Clipboard
    copyBtn.addEventListener('click', async () => {
        const activeTab = document.querySelector('.output-content:not(.hidden)');
        if (!activeTab) return;
        
        try {
            await navigator.clipboard.writeText(activeTab.value);
            
            // Show toast
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
            
            setTimeout(() => {
                toast.style.transform = 'translateY(20px)';
                toast.style.opacity = '0';
            }, 3000);
            
            // Visual feedback on button
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            copyBtn.classList.add('border-emerald-500', 'text-emerald-400');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('border-emerald-500', 'text-emerald-400');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });

    // Utils
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
