from datetime import datetime, timedelta

to_date = (datetime.now()+timedelta(days=365)).strftime("%Y-%m-%d")
print(to_date)