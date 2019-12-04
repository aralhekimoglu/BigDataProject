from django.shortcuts import render
from django.http import HttpResponse
import requests

def index(request):
    response = requests.get('https://bdfinalproject.azurewebsites.net/api/jobs')
    jobdata = response.json()



    return render(request, "homepage/index.html", {
        'joblist' : jobdata["jobList"]
    })
# Create your views here.
