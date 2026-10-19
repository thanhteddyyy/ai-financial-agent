Notes ghi chú kiến thức, kiến trúc trong file


Cấu trúc của file geminiSerivices.ts
4 phần:
I. Define interface và Init
II. Tools definition: getGetCryptoPriceTool and getConvertCurrencyTool
III. Tools execution: executeCryptoTool
IV. Loop and action - located: askAiAgent
 1. prmopt user -> message
 2. requestConfig(mode: AUTO) 
 3. check (function calls): 
 if(text) --> got answer --> break
 else if (AI call tools) --> auto run code again --> not exceed 10 times (prevent hallucination)
