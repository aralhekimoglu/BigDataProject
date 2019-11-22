package com.sparkcloud.spark.example

import java.util.Properties

import org.apache.spark.SparkConf
import org.apache.spark.SparkContext
import org.apache.spark.rdd.RDD
import org.apache.spark.sql.{Encoders, Row, SparkSession}
import org.apache.spark.SparkConf
import org.apache.spark.rdd.RDD
import org.apache.spark.sql.types.{IntegerType, StringType, StructField, StructType}

object App {
  def main (arg: Array[String]): Unit = {

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

    // SQL Parameters
    val jdbcUsername = "aral.hekimoglu"
    val jdbcPassword = "NYara.1470"
    val jdbcHostname = "dbprojectserver.database.windows.net" //typically, this is in the form or servername.database.windows.net
    val jdbcPort = 1433
    val jdbcDatabase ="projectdb"

    val jdbc_url = s"jdbc:sqlserver://${jdbcHostname}:${jdbcPort};database=${jdbcDatabase};encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=60;"
    val connectionProperties = new Properties()
    connectionProperties.put("user", s"${jdbcUsername}")
    connectionProperties.put("password", s"${jdbcPassword}")

    // Read SQL
    val sqlTableDF = spark.read.jdbc(jdbc_url,"dbo.training_table",connectionProperties)
    val texts: RDD[Row] = sqlTableDF.rdd
    val positive_text = texts.filter(text => text(1)==1)
    val negative_text = texts.filter(text => text(1)==0)

    // Function to process text file and get word counts.
    def preprocess( line : Row) : Array[String] = {
      val s = line(0).toString()
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

    // Get word counts for all positive and negative texts
    val pos_w2c = getWord2Count(positive_text)
    val neg_w2c = getWord2Count(negative_text)
    val final_rdd = pos_w2c.fullOuterJoin(neg_w2c).map {
      case (word, (pos, neg)) =>(word, pos.getOrElse(0),neg.getOrElse(0))
    }

    // Write the results back to a Sql table
    val row_final = final_rdd.map(entry => Row(entry._1,entry._2,entry._3))
    val schema = StructType(
      Seq(
        StructField(name = "word", dataType = StringType, nullable = false),
        StructField(name = "posCount", dataType = IntegerType, nullable = false),
        StructField(name = "negCount", dataType = IntegerType, nullable = false)
      )
    )

    val df = spark.createDataFrame(row_final,schema)

    df.createOrReplaceTempView("tempvocab")
    spark.sql("DROP TABLE IF EXISTS word_table")
    spark.sql("create table word_table as select * from tempvocab")
    spark.table("word_table").write.jdbc(jdbc_url, "wordtable", connectionProperties)

  }
}
