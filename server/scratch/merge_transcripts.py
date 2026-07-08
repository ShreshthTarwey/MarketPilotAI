import json
import os

old_dir = r"C:\Users\Asus\.gemini\antigravity-ide\brain\fc39ca14-f534-4b6a-8a10-2d662c67431d\.system_generated\logs"
cur_dir = r"C:\Users\Asus\.gemini\antigravity-ide\brain\dd5a3ad1-5342-4168-b97b-49290cd2bcf7\.system_generated\logs"

def merge_file(filename):
    old_path = os.path.join(old_dir, filename)
    cur_path = os.path.join(cur_dir, filename)
    
    if not os.path.exists(old_path):
        print(f"Old file not found: {old_path}")
        return
    if not os.path.exists(cur_path):
        print(f"Current file not found: {cur_path}")
        return
        
    # Read old lines
    with open(old_path, 'r', encoding='utf-8') as f:
        old_lines = [line.strip() for line in f if line.strip()]
        
    # Read current lines
    with open(cur_path, 'r', encoding='utf-8') as f:
        cur_lines = [line.strip() for line in f if line.strip()]
        
    print(f"Merging {filename}: {len(old_lines)} old lines, {len(cur_lines)} current lines")
    
    # Parse and combine
    combined_steps = []
    
    for line in old_lines:
        try:
            step = json.loads(line)
            combined_steps.append(step)
        except Exception as e:
            print(f"Error parsing old line: {e}")
            
    for line in cur_lines:
        try:
            step = json.loads(line)
            combined_steps.append(step)
        except Exception as e:
            print(f"Error parsing current line: {e}")
            
    # Re-index step_index
    for idx, step in enumerate(combined_steps):
        step["step_index"] = idx
        
    # Back up current file
    backup_path = cur_path + ".bak"
    if not os.path.exists(backup_path):
        try:
            os.rename(cur_path, backup_path)
            print(f"Created backup at {backup_path}")
        except Exception as e:
            print(f"Backup failed: {e}")
            
    # Write combined lines
    with open(cur_path, 'w', encoding='utf-8') as f:
        for step in combined_steps:
            f.write(json.dumps(step) + "\n")
            
    print(f"Successfully wrote {len(combined_steps)} lines to {cur_path}")

if __name__ == "__main__":
    merge_file("transcript.jsonl")
    merge_file("transcript_full.jsonl")
