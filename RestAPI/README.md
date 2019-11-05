# REST Functions

Necessary functions for the project to work will go here.

## TODO

- Write functions for various websites. Each function should accept a query word and a flag indicating test or train. That function will be responsible for finding text from the corresponding website including those words. If a website has a score for that text and flag for training is set, data will be stored in training table otherwise it will be stored in the query table. For example, Reddit has no scores for a text, therefore it can only be used for storing test data. RottenTomatoes has some score therefore if we are in the training phase it should insert into the training table, otherwise it should insert into query table.

- David if you can upload one example of how you implemented your function in P1, we can use that as an example.

Note: Getting and storing can also be seperated into two functions.