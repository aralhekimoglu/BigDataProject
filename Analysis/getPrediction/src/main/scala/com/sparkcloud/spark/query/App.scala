package com.sparkcloud.spark.query

import java.util.Properties

import org.apache.spark.SparkConf
import org.apache.spark.sql.SparkSession
import org.apache.spark.rdd.RDD
import org.apache.spark.sql.types.{StringType, StructField, StructType, IntegerType}
import org.apache.spark.sql.{Encoders, Row, SparkSession}

object getPrediction {
  def main (arg: Array[String]): Unit = {

    val jobid = arg(0)

    val conf = new SparkConf()
      .set("spark.sql.warehouse.dir", "hdfs://namenode/sql/metadata/hive")
      .set("spark.sql.catalogImplementation","hive")
      .setAppName("cpApp")

    // val sc = new SparkContext(conf)

    val spark = SparkSession
      .builder()
      .appName("cpApp")
      .enableHiveSupport()
      .config(conf)
      .getOrCreate()

    import spark.implicits._

    // SQL Parameters

    val jdbcUsername = "ricardowang"
    val jdbcPassword = "FinalProject6513"
    val jdbcHostname = "cs6513.database.windows.net" //typically, this is in the form or servername.database.windows.net
    val jdbcPort = 1433
    val jdbcDatabase ="finalproject"

    val jdbc_url = s"jdbc:sqlserver://${jdbcHostname}:${jdbcPort};database=${jdbcDatabase};encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=60;"
    val connectionProperties = new Properties()
    connectionProperties.put("user", s"${jdbcUsername}")
    connectionProperties.put("password", s"${jdbcPassword}")

    def preprocess( line : Row) : Array[String] = {
      val s = line(7).toString()
      val s_nopunct = s.replaceAll("""[\p{Punct}&&[^.]]""", "")
      val s_lower = s_nopunct.toLowerCase()

      return s_lower.split(" ")
    }

    def getWord2Count(text: RDD[Row]) : RDD[(String, Int)] = {
      val words = text.flatMap(preprocess)
      val stop_words = List("the","was","i","a","is");
      val words_filtered = words.filter(word => !stop_words.contains(word))

      val words_kv = words_filtered.map(k => (k,1))
      val word2count = words_kv.reduceByKey((k,v)=>(k+v))
      return word2count
    }

    val test_table_df = spark.read.jdbc(jdbc_url,"dbo.reddit_messages",connectionProperties)

    val test_texts: RDD[Row] = test_table_df.rdd
    val test_texts2 = test_texts.filter(text => text(0) == jobid)

    val test_w2c = getWord2Count(test_texts2)
    val wordtable_df = spark.read.jdbc(jdbc_url,"dbo.word_table",connectionProperties)
    val words: RDD[Row] = wordtable_df.rdd
    val word_row2rdd = words.map(line=> (line.getString(0),(line.getInt(1),line.getInt(2))))
    val joined = word_row2rdd.join(test_w2c)
    val scores = {
      joined.map(list => (list._2._2 * (list._2._1._1 - list._2._1._2)))
    }
    val score = scores.reduce(_ + _)
    val pred = score>=0

    spark.sql("DROP TABLE IF EXISTS results")
    spark.sql("create table results (jobid varchar(64), results int)")
    spark.sql("insert into results values ('"+jobid+"',"+pred+")")
    spark.table("results").write.mode("append").jdbc(jdbc_url,"results",connectionProperties)

   /*
    val scores_df = scores.toDF()
    scores_df.createOrReplaceTempView("tempscores")

    spark.sql("DROP TABLE IF EXISTS results")

    //spark.sql("create table scores_table as select * from tempscores")
    spark.sql("create table results (jobid varchar(64), results int)")
    spark.sql("insert into results (job1,1)")

    spark.table("results").write.mode("append").jdbc(jdbc_url, "results", connectionProperties)
    */
  }
}