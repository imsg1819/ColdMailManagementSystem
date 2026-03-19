"""
check_replies.py — IMAP reply detector.
Logs into Gmail via IMAP, searches inbox for replies matching stored Message-IDs,
and calls a Next.js API to mark contacts as "Replied".
Uses only Python built-in libraries (imaplib, email).
"""
import imaplib
import email
import json
import sys
import urllib.request


def check_replies():
    # Read JSON input from stdin: { sender_email, app_password, contacts: [{id, sentMessageId}], api_url }
    input_data = sys.stdin.read()
    if not input_data:
        print(json.dumps({"success": False, "error": "No input data"}))
        return

    data = json.loads(input_data)
    sender_email = data.get("sender_email")
    app_password = data.get("app_password")
    contacts = data.get("contacts", [])  # list of {id, sentMessageId}
    api_url = data.get("api_url", "http://localhost:3000/api/campaigns/mark-replied")

    if not sender_email or not app_password:
        print(json.dumps({"success": False, "error": "Missing credentials"}))
        return

    if not contacts:
        print(json.dumps({"success": True, "message": "No contacts to check", "repliedCount": 0}))
        return

    # Build a lookup: Message-ID -> recipient DB id
    message_id_map = {}
    for c in contacts:
        mid = c.get("sentMessageId")
        if mid:
            # Normalize — strip angle brackets if present
            mid = mid.strip().strip("<>")
            message_id_map[mid] = c["id"]

    if not message_id_map:
        print(json.dumps({"success": True, "message": "No Message-IDs to check", "repliedCount": 0}))
        return

    replied_ids = []

    try:
        # Connect to Gmail IMAP
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(sender_email, app_password)
        mail.select("INBOX")

        # Search all emails in inbox
        status, msg_nums = mail.search(None, "ALL")
        if status != "OK":
            print(json.dumps({"success": False, "error": "IMAP search failed"}))
            return

        # Iterate through inbox messages and check In-Reply-To header
        for num in msg_nums[0].split():
            # Fetch only headers to save bandwidth
            status, msg_data = mail.fetch(num, "(RFC822.HEADER)")
            if status != "OK":
                continue

            raw_header = msg_data[0][1]
            msg = email.message_from_bytes(raw_header)

            # Check In-Reply-To header
            in_reply_to = msg.get("In-Reply-To", "").strip().strip("<>")
            if in_reply_to and in_reply_to in message_id_map:
                replied_ids.append(message_id_map[in_reply_to])
                # Remove from map so we don't double-match
                del message_id_map[in_reply_to]

            # Also check References header (some clients use this instead)
            references = msg.get("References", "")
            if references:
                for ref in references.split():
                    ref = ref.strip().strip("<>")
                    if ref in message_id_map:
                        replied_ids.append(message_id_map[ref])
                        del message_id_map[ref]

            # Stop early if all matched
            if not message_id_map:
                break

        mail.logout()

    except imaplib.IMAP4.error as e:
        print(json.dumps({"success": False, "error": f"IMAP error: {str(e)}"}))
        return
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return

    # Call the Next.js API to mark each replied contact
    marked_count = 0
    for rid in replied_ids:
        try:
            payload = json.dumps({"recipientId": rid}).encode("utf-8")
            req = urllib.request.Request(
                api_url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    marked_count += 1
        except Exception:
            pass  # Best-effort; errors are non-fatal

    print(json.dumps({
        "success": True,
        "repliedCount": marked_count,
        "totalChecked": len(contacts)
    }))


if __name__ == "__main__":
    check_replies()
