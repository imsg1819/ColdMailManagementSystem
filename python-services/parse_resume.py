import sys
import json
import fitz # PyMuPDF

def extract_text_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        
        # Output clean JSON to stdout for Next.js to capture
        result = {"success": True, "text": text.strip()}
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided."}))
        sys.exit(1)
    
    extract_text_from_pdf(sys.argv[1])
