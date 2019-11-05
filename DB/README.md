# Database & Database API

- SQL files to create database.
- Sample SQL calls to insert into and query from database.(These sample sql statements will be called from inside the Azure Functions)

## TODO

- Create database and 3 tables.
- Training table(Text,Score,Source,Date): Will be populated by training samples we find from various sources.
- Query table(Text,Score,Source,Date): When a user enters a query, will be populated with corresponding topic and source.
- Vocabulary table(Word,# of Positive Labels, # of Total Labels): After training, this table will be updated in the following manner: If word is present in the table, corresponding counts will be incremented. If word is not in the table, counts from the training will be used to initialize the row for that word.
