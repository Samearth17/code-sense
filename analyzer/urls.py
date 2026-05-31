from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.analyze_code, name='analyze_code'),
    path('upload/', views.upload_file, name='upload_file'),
    path('github/', views.analyze_github, name='analyze_github'),
    path('detect/', views.detect_ai_code, name='detect_ai_code'),
]