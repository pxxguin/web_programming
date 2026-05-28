import os
import glob

html_files = glob.glob('*.html')

target = """                <div class="form-row">
                    <div class="form-group">
                        <label for="amount">금액</label>
                        <div class="input-with-icon">
                            <span class="currency-symbol">₩</span>
                            <input type="number" id="amount" required placeholder="0" min="1">
                        </div>
                    </div>
                </div>"""

replacement = """                <div class="form-row split">
                    <div class="form-group">
                        <label for="amount">금액</label>
                        <div class="input-with-icon">
                            <span class="currency-symbol">₩</span>
                            <input type="number" id="amount" required placeholder="0" min="1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="transactionAccount">연결 통장</label>
                        <select id="transactionAccount" required>
                            <option value="none">지정 안함 (현금)</option>
                        </select>
                    </div>
                </div>"""

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target in content:
        content = content.replace(target, replacement)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
    else:
        print(f"Target not found in {file}")

