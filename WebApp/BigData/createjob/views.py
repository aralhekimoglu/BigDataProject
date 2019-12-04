from django.shortcuts import render
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
import requests

@csrf_exempt
def index(request):
    return render(request, "createjob/index.html")
@csrf_exempt
def submit(request):
    if request.method == 'POST':
        subreddit = request.POST.get('subreddit')
        topic = request.POST.get('topic')
        response = requests.post("https://bdfinalproject.azurewebsites.net/api/jobs?subreddit=%s&topic=%s&min_messages=1000" % (subreddit, topic))
    return redirect("homepage:index")
# Create your views here.
