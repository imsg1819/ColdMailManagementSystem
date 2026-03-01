import pandas as pd

data = {
    'Name': ['Alice Test', 'Bob Test'],
    'Company': ['Acme Corp', 'Globex'],
    'Email': ['abc@gmail.com', 'test-bob@example.com']
}

df = pd.DataFrame(data)
df.to_excel('test_recipients.xlsx', index=False)
print('Test file generated.')
