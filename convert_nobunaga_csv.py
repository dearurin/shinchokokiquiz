import csv
import json
import sys

# Reconfigure stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# The 25 specific topics and their categories
# 12 人物 (Figures)
# 7 合戦・名場面 (Battles & Scenes)
# 6 名物・名城 (Treasures & Castles)

def get_topic_and_category(q_id):
    # Determine Shinchokoki Goshuin stamp topics based on Question ID (1-102)
    # The categories are represented in the 'army' field to reuse existing JS properties.
    if q_id in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 42, 43]:
        return "吉法師", "人物"
    elif q_id in [15]:
        return "平手政秀", "人物"
    elif q_id in [17, 18, 19, 44, 45, 46]:
        return "正徳寺会見", "合戦・名場面"
    elif q_id in [34]:
        return "敦盛", "合戦・名場面"
    elif q_id in [35, 36, 37, 38, 39, 40]:
        return "今川義元", "人物"
    elif q_id in [41]:
        return "宗三左文字", "名物・名城"
    elif q_id in [52, 53, 54, 55, 65, 66, 67, 94]:
        return "天下布武", "名物・名城"
    elif q_id in [56, 57, 58, 59, 60, 61, 62]:
        return "足利義昭", "人物"
    elif q_id in [63, 64]:
        return "藤戸石", "名物・名城"
    elif q_id in [68, 69]:
        return "浅井長政", "人物"
    elif q_id in [70]:
        return "杉谷善住坊", "人物"
    elif q_id in [71, 72, 73]:
        return "姉川の戦い", "合戦・名場面"
    elif q_id in [74]:
        return "比叡山焼き討ち", "合戦・名場面"
    elif q_id in [75, 76]:
        return "蘭奢待", "名物・名城"
    elif q_id in [78, 79, 80, 81, 82]:
        return "長篠の戦い", "合戦・名場面"
    elif q_id in [83, 84, 85, 96, 102]:
        return "織田信忠", "人物"
    elif q_id in [86, 89, 90, 95]:
        return "安土城", "名物・名城"
    elif q_id in [87]:
        return "蛇石", "名物・名城"
    elif q_id in [88]:
        return "狩野永徳", "人物"
    elif q_id in [92, 93]:
        return "松永久秀", "人物"
    elif q_id in [77, 96]:
        return "御馬揃え", "合戦・名場面"
    elif q_id in [97, 98]:
        return "明智光秀", "人物"
    elif q_id in [99]:
        return "森乱", "人物"
    elif q_id in [100, 101]:
        return "本能寺の変", "合戦・名場面"
    else:
        return "太田牛一", "人物"

print("Starting Shinchokoki CSV to JS conversion...")

questions_list = []
csv_filename = '信長公記クイズ - 信長公記_織田信長クイズ123問.csv'

try:
    with open(csv_filename, mode='r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader) # Skip header
        
        for idx, row in enumerate(reader):
            if not row or len(row) < 10:
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
            ans_e = row[6].strip()
            
            correct_num_str = row[7].strip()
            correct_text = row[8].strip()
            citation = row[9].strip()
            remarks = row[10].strip() if len(row) > 10 else ""
            
            # Form clean list of choices (excluding empty choices if any, but standardizing on all provided choices)
            choices = [ans_a, ans_b, ans_c, ans_d]
            if ans_e:
                choices.append(ans_e)
            
            # Build explanation with citation details
            full_explanation = remarks
            if citation:
                full_explanation += f" (『信長公記』{citation} より)"
                
            # Map topic (commander)
            topic, _ = get_topic_and_category(q_id)
            
            q_obj = {
                "id": q_id,
                "commander": topic,
                "question": question_text,
                "choices": choices,
                "answer": correct_text,
                "explanation": full_explanation
            }
            questions_list.append(q_obj)
            
    print(f"Parsed {len(questions_list)} questions successfully.")
    
    # Write to questions.js
    with open('questions.js', mode='w', encoding='utf-8') as out_f:
        out_f.write("/**\n")
        out_f.write(" * 織田信長の一代記『信長公記』本格クイズ - クイズ問題データベース (全102問)\n")
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
