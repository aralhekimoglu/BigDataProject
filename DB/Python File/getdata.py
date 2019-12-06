import json
import gzip
import pandas as pd
import sql


#get small data (3000) from amazon fashion review for testing our functions
def parse(path):
    result = []
    cnt = 1
    with open(path, 'r') as file:
        for f in file:
            data = json.loads(f)
            try:
                overall, source, text = data['overall'], 'Amazon_Fashion', data['reviewText']
            except:
                print("error read line: " + str(cnt))
            result.append((overall,text, source))
            cnt += 1
    return result
            
            
# get larger data (around one million) from amazon tv and movie review for our training model 
def parse_large(path):
    result = []
    cnt = 1
    with open(path, 'r') as file:
        for f in file:
            yield json.loads(f)

def getDF(path):
    i = 0
    df = {}
    for d in parse_large(path):
        if i > 1000000:
            break
        df[i] = d
        i += 1
    return pd.DataFrame.from_dict(df, orient='index')
    

if __name__ == "__main__":
    #dic = getDF("AMAZON_FASHION_5.json")
    dic_1 = getDF("Movies_and_TV.json")
    for i in range(1,1000000,100000):
        print("Start with i:" + str(i))
        l = []
        end = i + 100000
        while i < end:
            overall = dic_1.iloc[i]["overall"]
            reviewText = dic_1.iloc[i]["reviewText"]
            i += 1
            if type(overall) == float:
                print(overall)
            if type(reviewText) == float or len(reviewText) > 8000:
                continue
            l.append((overall, reviewText))
        test = sql.insertTable(l)
    #print(test)
