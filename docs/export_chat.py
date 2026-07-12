import json
import re
import os
import sys

# Paths for the current conversation session
# CONVERSATION_ID = "fc39ca14-f534-4b6a-8a10-2d662c67431d"
CONVERSATION_ID = "dd5a3ad1-5342-4168-b97b-49290cd2bcf7"
DEFAULT_TRANSCRIPT_PATH = rf"C:\Users\Asus\.gemini\antigravity-ide\brain\{CONVERSATION_ID}\.system_generated\logs\transcript.jsonl"
DEFAULT_OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "chat_history.md"))

def clean_user_content(content):
    if not content:
        return ""
    # Extract the portion inside <USER_REQUEST> ... </USER_REQUEST> if present
    match = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return content.strip()

def is_substantial(msg_type, content, source):
    if not content:
        return False
    
    # Ignore commands or short instructions
    if msg_type == "USER_INPUT":
        cleaned_user = clean_user_content(content).lower().strip()
        
        # Filter out simple tasks
        if any(phrase in cleaned_user for phrase in ["commit message", "git ", "git status", "git add", "continue", "stage changes"]):
            return False
            
        # Filter out short messages containing visual adjustments
        if len(cleaned_user) < 200 and any(w in cleaned_user for w in ["small", "same", "wrong", "screenshot", "looks", "quality", "size"]):
            return False
            
    return True

def export_transcript(transcript_path, output_path):
    if not os.path.exists(transcript_path):
        print(f"Transcript file not found at: {transcript_path}")
        print("Please verify the conversation ID or check if the IDE has written the logs yet.")
        return

    # Read existing content
    existing_content = ""
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f_old:
            existing_content = f_old.read().strip()
            
    # Check if this session is already appended to avoid duplicate appends
    if f"Session ID: {CONVERSATION_ID}" in existing_content:
        print(f"Session {CONVERSATION_ID} is already appended to {output_path}. Skipping duplication.")
        return

    # Extract and format current session
    formatted_chat = []
    formatted_chat.append(f"\n\n---\n\n# Conversation History (MarketPilot AI Development Session - Continued)\n")
    formatted_chat.append(f"*Session ID: {CONVERSATION_ID}*\n")
    formatted_chat.append(f"*Log Source: {transcript_path}*\n\n---\n")

    current_user_request = None

    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                source = data.get("source")
                msg_type = data.get("type")
                content = data.get("content")
                
                # Check for User Input
                if source == "USER_EXPLICIT" and msg_type == "USER_INPUT":
                    if is_substantial(msg_type, content, source):
                        cleaned = clean_user_content(content)
                        if cleaned:
                            current_user_request = f"## 👤 User\n\n<USER_REQUEST>\n{cleaned}\n</USER_REQUEST>\n\n---\n"
                    else:
                        current_user_request = None
                
                # Check for Model Response
                elif source == "MODEL" and msg_type == "PLANNER_RESPONSE" and content:
                    if current_user_request:
                        formatted_chat.append(current_user_request)
                        formatted_chat.append(f"## 🤖 Assistant\n\n{content.strip()}\n\n---\n")
                        current_user_request = None
            except Exception as e:
                continue

    # Combine content
    combined_content = existing_content + "\n" + "\n".join(formatted_chat)

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f_out:
        f_out.write(combined_content.strip() + "\n")
    print(f"Successfully appended clean chat history to:\n  {output_path}")

if __name__ == "__main__":
    t_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TRANSCRIPT_PATH
    o_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT_PATH
    export_transcript(t_path, o_path)
