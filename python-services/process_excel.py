import sys
import json
import pandas as pd

def process_excel(excel_path):
    try:
        df = pd.read_excel(excel_path)
        
        # Strip potential whitespace from column names
        df.columns = df.columns.str.strip()

        # Only Email is mandatory
        if "Email" not in df.columns:
            print(json.dumps({"success": False, "error": "Missing required 'Email' column in Excel file."}))
            return

        # Drop rows where Email is missing
        df.dropna(subset=["Email"], inplace=True)

        recipients = []
        for index, row in df.iterrows():
            email = str(row["Email"]).strip()
            if not email or email == "nan":
                continue
            
            name = ""
            company = ""
            location = ""
            
            if "Name" in df.columns and pd.notna(row.get("Name")):
                name = str(row["Name"]).strip()
            
            if "Company" in df.columns and pd.notna(row.get("Company")):
                company = str(row["Company"]).strip()
            
            # Check for Location column (various common header names)
            location_cols = ["Location", "City", "State", "Region", "Address", "Office"]
            for col in location_cols:
                if col in df.columns and pd.notna(row.get(col)):
                    loc_val = str(row[col]).strip()
                    if loc_val and loc_val != "nan":
                        location = loc_val
                        break
            
            recipients.append({
                "name": name,
                "company": company,
                "email": email,
                "location": location,
                "status": "Pending"
            })
            
        print(json.dumps({"success": True, "recipients": recipients}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No Excel path provided."}))
        sys.exit(1)
    
    process_excel(sys.argv[1])
