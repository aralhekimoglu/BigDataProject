import org.apache.spark.SparkConf
import org.apache.spark.SparkContext
import java.util.Properties

import org.apache.spark.sql.{SQLContext, SparkSession}

import java.util.Properties
import org.apache.spark.sql.types.{StructType, StructField, StringType, IntegerType,DoubleType};
import org.apache.spark.sql.Row
import org.apache.spark.rdd.RDD

import org.apache.spark.sql.{Encoder, Encoders}

object cpApp{
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
    /*
    // Dummy Job
    val rdd = sc.textFile("wasbs:///HdiSamples/HdiSamples/SensorSampleData/hvac/HVAC.csv")
    //find the rows that have only one digit in the seventh column in the CSV file
    val rdd1 =  rdd.filter(s => s.split(",")(6).length() == 1)
    rdd1.saveAsTextFile("wasbs:///OUTPUT1.csv")
    */

    // Read SQL
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
    val scores = sqlTableDF.select("score")
    val scoresRDD = scores.map(x=>x.toString())(Encoders.STRING).rdd

    val rows: RDD[Row] = scoresRDD map {case (scores) =>Row(scores)}
    object schema {
      val scores = StructField("scores", StringType)
      val struct = StructType(Array(scores))
    }
    val df = spark.createDataFrame(rows, schema.struct)

    df.createOrReplaceTempView("temp_vocab")
    spark.sql("create table vocab_table3 as select * from temp_vocab")
    spark.table("vocab_table3").write.jdbc(jdbc_url, "vocabtable", connectionProperties)

    /*
    // Write SQL
    val userSchema = spark.read.option("header", "true").csv("wasbs:///HdiSamples/HdiSamples/SensorSampleData/hvac/HVAC.csv").schema
    val readDf = spark.read.format("csv").schema(userSchema).load("wasbs:///HdiSamples/HdiSamples/SensorSampleData/hvac/HVAC.csv")
    readDf.createOrReplaceTempView("temphvactable")
    spark.sql("create table hvactable_hive as select * from temphvactable")
    spark.table("hvactable_hive").write.jdbc(jdbc_url, "hvactable", connectionProperties)
    */
  }
}