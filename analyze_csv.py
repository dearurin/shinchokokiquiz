import csv
import json
import re

csv_path = r"c:\Users\gatsu\Desktop\HTML\信長公記クイズ\信長公記クイズ - 信長公記_織田信長クイズ123問.csv"
output_path = r"c:\Users\gatsu\Desktop\HTML\信長公記クイズ\csv_analysis_result.txt"

volumes = {}
uniques = set()
questions = []

with open(csv_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    header = next(reader)
    for idx, row in enumerate(reader):
        if not row or len(row) < 10:
            continue
        q_id = row[0].strip()
        q_text = row[1].strip()
        c1 = row[2].strip()
        c2 = row[3].strip()
        c3 = row[4].strip()
        c4 = row[5].strip()
        c5 = row[6].strip()
        ans_num = row[7].strip()
        ans_text = row[8].strip()
        source = row[9].strip()
        remarks = row[10].strip() if len(row) > 10 else ""
        
        # Extract volume prefix
        match = re.match(r"^([^\（]+)（", source)
        vol = match.group(1).strip() if match else source.strip()
        volumes[vol] = volumes.get(vol, 0) + 1
        uniques.add(vol)
        
        questions.append({
            "id": q_id,
            "vol": vol,
            "source": source,
            "question": q_text,
            "answer": ans_text
        })

result = []
result.append(f"Total parsed questions: {len(questions)}")
result.append("\nVolume distribution:")
for k, v in sorted(volumes.items()):
    result.append(f"  {k}: {v} questions")

result.append("\nFirst 10 parsed questions:")
for q in questions[:10]:
    result.append(f"  ID {q['id']} ({q['vol']}): {q['question'][:40]}... -> Ans: {q['answer']}")

with open(output_path, mode='w', encoding='utf-8') as out_f:
    out_f.write("\n".join(result))

print("Analysis completed successfully.")
