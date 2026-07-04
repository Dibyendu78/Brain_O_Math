from django.urls import path

from EventMgnt import views


urlpatterns = [
    path("verify/", views.verify_page, name="verify"),
]
