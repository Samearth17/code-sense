from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings as django_settings
from django.conf.urls.static import static

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('analyzer.urls')),
]

if django_settings.DEBUG:
    urlpatterns += static(django_settings.STATIC_URL, document_root=django_settings.STATICFILES_DIRS[0])
    urlpatterns += static(django_settings.MEDIA_URL, document_root=django_settings.MEDIA_ROOT)