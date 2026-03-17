Output demo.gif

Set Shell "zsh"
Set FontSize 13
Set Width 1000
Set Height 560
Set Theme "Dracula"
Set Padding 20
Set PlaybackSpeed 1.0
Set TypingSpeed 40ms

# 1. What does the agent want to do?
Type "gatefile inspect-plan .demo/plan.json"
Enter
Sleep 3500ms

# 2. Approve it (hash-locked)
Type "gatefile approve-plan .demo/plan.json --by steve"
Enter
Sleep 1500ms

# 3. Verify integrity
Type "gatefile verify-plan .demo/plan.json"
Enter
Sleep 1500ms

# 4. Dry run
Type "gatefile apply-plan .demo/plan.json --dry-run"
Enter
Sleep 2000ms

# 5. Apply for real
Type "gatefile apply-plan .demo/plan.json"
Enter
Sleep 2500ms

# 6. Audit trail
Type "gatefile audit"
Enter
Sleep 2500ms

Sleep 1000ms
