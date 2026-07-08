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

def export_transcript(transcript_path, output_path):
    if not os.path.exists(transcript_path):
        print(f"Transcript file not found at: {transcript_path}")
        print("Please verify the conversation ID or check if the IDE has written the logs yet.")
        return

    formatted_chat = []
    formatted_chat.append("# Conversation History (MarketPilot AI Development Session)\n")
    formatted_chat.append(f"*Session ID: {CONVERSATION_ID}*\n")
    formatted_chat.append(f"*Log Source: {transcript_path}*\n\n---\n")

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
                    cleaned = clean_user_content(content)
                    if cleaned:
                        formatted_chat.append(f"## 👤 User\n\n{cleaned}\n\n---\n")
                
                # Check for Model Response
                elif source == "MODEL" and msg_type == "PLANNER_RESPONSE" and content:
                    formatted_chat.append(f"## 🤖 Assistant\n\n{content.strip()}\n\n---\n")
            except Exception as e:
                # Silently ignore parsing errors or other log types
                continue

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f_out:
        f_out.write("\n".join(formatted_chat))
    print(f"Successfully exported clean chat history to:\n  {output_path}")

if __name__ == "__main__":
    t_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TRANSCRIPT_PATH
    o_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT_PATH
    export_transcript(t_path, o_path)
