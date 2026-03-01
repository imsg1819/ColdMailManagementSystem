"""
One-time Microsoft Graph API authentication setup.
Run this script ONCE in a terminal to authenticate with your corporate email.
After authenticating, the token is cached and send_email_graph.py will use it automatically.
"""
import msal
import json
import os
import sys

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/common"
SCOPES = ["Mail.Send"]
TOKEN_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".graph_token_cache.json")

def setup_auth():
    cache = msal.SerializableTokenCache()
    if os.path.exists(TOKEN_CACHE_FILE):
        with open(TOKEN_CACHE_FILE, "r") as f:
            cache.deserialize(f.read())

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )

    # Check if already authenticated
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            print(f"\n✅ Already authenticated as: {accounts[0]['username']}")
            print("Token is valid. You can launch campaigns now!")
            if cache.has_state_changed:
                with open(TOKEN_CACHE_FILE, "w") as f:
                    f.write(cache.serialize())
            return

    # Start device code flow
    print("\n" + "=" * 60)
    print("  Microsoft 365 Authentication Setup")
    print("=" * 60)
    
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        print(f"Error: {json.dumps(flow, indent=2)}")
        return

    print(f"\n📋 {flow['message']}")
    print(f"\n👉 Open: {flow['verification_uri']}")
    print(f"👉 Enter code: {flow['user_code']}")
    print("\nWaiting for you to complete authentication...")
    print("(Approve via Microsoft Authenticator if prompted)\n")

    result = app.acquire_token_by_device_flow(flow)

    if "access_token" in result:
        print("\n✅ Authentication successful!")
        print(f"   Logged in as: {result.get('id_token_claims', {}).get('preferred_username', 'Unknown')}")
        print("   Token cached. You can now launch campaigns from the app!")
        with open(TOKEN_CACHE_FILE, "w") as f:
            f.write(cache.serialize())
    else:
        print(f"\n❌ Authentication failed: {result.get('error_description', result.get('error', 'Unknown'))}")

if __name__ == "__main__":
    setup_auth()
