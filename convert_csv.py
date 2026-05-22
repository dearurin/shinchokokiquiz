import csv
import json
import sys

# Reconfigure stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Commander and Army mapping based on CSV Question ID (問題番号)
# Exactly 25 commanders:
# 1. 徳川家康 (East)
# 2. 石田三成 (West)
# 3. 大谷吉継 (West)
# 4. 小早川秀秋 (East)
# 5. 吉川広家 (East)
# 6. 毛利輝元 (West)
# 7. 島津義弘 (West)
# 8. 真田昌幸 (West)
# 9. 直江兼続 (West)
# 10. 福島正則 (East)
# 11. 黒田如水 (East)
# 12. 加藤清正 (East)
# 13. 伊達政宗 (East)
# 14. 細川忠興 (East)
# 15. 安国寺恵瓊 (West)
# 16. 長宗我部盛親 (West)
# 17. 前田利家 (West)
# 18. 豊臣秀頼 (West)
# 19. 宇喜多秀家 (West)
# 20. 徳川秀忠 (East)
# 21. 毛利秀元 (West)
# 22. 真田幸村 (West)
# 23. 鍋島直茂 (West)
# 24. 前田利長 (East)
# 25. 黒田長政 (East)

commander_mapping = {
    1: ("徳川家康", "東軍"),
    2: ("豊臣秀頼", "西軍"),
    3: ("豊臣秀頼", "西軍"),
    4: ("豊臣秀頼", "西軍"),
    5: ("徳川家康", "東軍"),
    6: ("徳川家康", "東軍"),
    7: ("伊達政宗", "東軍"),
    8: ("前田利家", "西軍"),
    9: ("前田利家", "西軍"),
    10: ("前田利家", "西軍"),
    11: ("石田三成", "西軍"),
    12: ("加藤清正", "東軍"),
    13: ("石田三成", "西軍"),
    14: ("徳川家康", "東軍"),
    15: ("上杉景勝", "西軍"),
    16: ("直江兼続", "西軍"),
    17: ("直江兼続", "西軍"),
    18: ("徳川家康", "東軍"),
    19: ("石田三成", "西軍"),
    20: ("毛利輝元", "西軍"),
    21: ("石田三成", "西軍"),
    22: ("徳川家康", "東軍"),
    23: ("徳川家康", "東軍"),
    24: ("福島正則", "東軍"),
    25: ("吉川広家", "東軍"),
    26: ("毛利秀元", "西軍"),
    27: ("毛利秀元", "西軍"),
    28: ("小早川秀秋", "東軍"),
    29: ("小早川秀秋", "東軍"),
    30: ("小早川秀秋", "東軍"),
    31: ("大谷吉継", "西軍"),
    32: ("黒田如水", "東軍"),
    33: ("黒田如水", "東軍"),
    34: ("黒田如水", "東軍"),
    35: ("島津義弘", "西軍"),
    36: ("島津義弘", "西軍"),
    37: ("徳川家康", "東軍"),
    38: ("豊臣秀頼", "西軍"),
    39: ("徳川家康", "東軍"),
    40: ("徳川家康", "東軍"),
    41: ("石田三成", "西軍"),
    42: ("黒田長政", "東軍"),
    43: ("加藤清正", "東軍"),
    44: ("上杉景勝", "西軍"),
    45: ("毛利輝元", "西軍"),
    46: ("徳川家康", "東軍"),
    47: ("石田三成", "西軍"),
    48: ("石田三成", "西軍"),
    49: ("石田三成", "西軍"),
    50: ("徳川家康", "東軍"),
    51: ("石田三成", "西軍"),
    52: ("上杉景勝", "西軍"),
    53: ("安国寺恵瓊", "西軍"),
    54: ("細川忠興", "東軍"),
    55: ("福島正則", "東軍"),
    56: ("徳川秀忠", "東軍"),
    57: ("真田昌幸", "西軍"),
    58: ("加藤清正", "東軍"),
    59: ("福島正則", "東軍"),
    60: ("石田三成", "西軍"),
    61: ("宇喜多秀家", "西軍"),
    62: ("石田三成", "西軍"),
    63: ("徳川秀忠", "東軍"),
    64: ("真田昌幸", "西軍"),
    65: ("加藤清正", "東軍"),
    66: ("福島正則", "東軍"),
    67: ("石田三成", "西軍"),
    68: ("石田三成", "西軍"),
    69: ("小早川秀秋", "東軍"),
    70: ("徳川家康", "東軍"),
    71: ("前田利長", "東軍"),
    72: ("前田利家", "西軍"),
    73: ("豊臣秀頼", "西軍"),
    74: ("石田三成", "西軍"),
    75: ("徳川家康", "東軍"),
    76: ("石田三成", "西軍"),
    77: ("毛利輝元", "西軍"),
    78: ("吉川広家", "東軍"),
    79: ("宇喜多秀家", "西軍"),
    80: ("徳川家康", "東軍"),
    81: ("豊臣秀頼", "西軍"),
    82: ("徳川家康", "東軍"),
    83: ("安国寺恵瓊", "西軍"),
    84: ("真田幸村", "西軍"),
    85: ("真田昌幸", "西軍"),
    86: ("石田三成", "西軍"),
    87: ("島津義弘", "西軍"),
    88: ("島津義弘", "西軍"),
    89: ("脇坂安治", "東軍"),
    90: ("大谷吉継", "西軍"),
    91: ("徳川家康", "東軍"),
    92: ("徳川家康", "東軍"),
    93: ("徳川秀忠", "東軍"),
    94: ("豊臣秀頼", "西軍"),
    95: ("徳川家康", "東軍"),
    96: ("鍋島直茂", "西軍"),
    97: ("宇喜多秀家", "西軍"),
    98: ("徳川家康", "東軍"),
    99: ("長宗我部盛親", "西軍"),
    100: ("徳川家康", "東軍")
}

print("Starting questions.csv to questions.js conversion...")

questions_list = []

try:
    with open('questions.csv', mode='r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader) # Skip header
        
        for idx, row in enumerate(reader):
            if not row or len(row) < 7:
                continue
            
            q_id_str = row[0].strip()
            if not q_id_str.isdigit():
                continue
                
            q_id = int(q_id_str)
            
            question_text = row[1].strip()
            ans_a = row[2].strip()
            ans_b = row[3].strip()
            ans_c = row[4].strip()
            ans_d = row[5].strip()
            explanation = row[6].strip()
            
            # Map commander and army
            commander, army = commander_mapping.get(q_id, ("徳川家康", "東軍"))
            
            choices = [ans_a, ans_b, ans_c, ans_d]
            
            q_obj = {
                "id": q_id,
                "commander": commander,
                "army": army,
                "question": question_text,
                "choices": choices,
                "answer": ans_a,
                "explanation": explanation
            }
            questions_list.append(q_obj)
            
    print(f"Parsed {len(questions_list)} questions successfully.")
    
    # Write to questions.js
    with open('questions.js', mode='w', encoding='utf-8') as out_f:
        out_f.write("/**\n")
        out_f.write(" * 天下分け目の関ヶ原クイズ - クイズ問題データベース (全100問)\n")
        out_f.write(" * CSVから自動生成されました。\n")
        out_f.write(" */\n\n")
        out_f.write("const QUIZ_QUESTIONS = ")
        # Pretty print JSON
        json_str = json.dumps(questions_list, ensure_ascii=False, indent=2)
        out_f.write(json_str)
        out_f.write(";\n")
        
    print("questions.js written successfully!")
except Exception as e:
    print(f"Error occurred: {e}")
    sys.exit(1)
