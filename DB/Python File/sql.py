import pyodbc
server = 'cs6513.database.windows.net'
database = 'finalproject'
username = 'ricardowang'
password = 'hide'
driver= '{ODBC Driver 17 for SQL Server}'
cnxn = pyodbc.connect('DRIVER='+driver+';SERVER='+server+';PORT=1433;DATABASE='+database+';UID='+username+';PWD='+ password)

def emptyTable():
    sql = "DELETE from amazon_review"
    cursor = cnxn.cursor()
    cursor.execute(sql)
    cursor.commit()
    return



def insertTable(params):
    cursor = cnxn.cursor()
    cursor.fast_executemany = True
    #sql = "INSERT INTO amazon_review (overall, review_text, review_source) VALUES (?, ?, ?)"
    sql = "INSERT INTO amazon_review_bd (overall, review_text) VALUES (?, ?)"
    cursor.executemany(sql, params)
    cursor.commit()
    return params[:100]

def get(query):
    cursor = cnxn.cursor()
    sql = """SELECT * FROM * where *=?"""
    cursor.execute(sql,str(query))
    rows = cursor.fetchall()
    return rows

def queryTable():
    cursor = cnxn.cursor()
    sql = "SELECT DISTINCT * from *"
    cursor.execute(sql)
    rows = cursor.fetchall()
    return rows
