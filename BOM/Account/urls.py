from django.urls import path

from Account import views


urlpatterns = [
    path("activate/<uidb64>/<token>/", views.activate, name="activate"),
    path("login/", views.account_login, name="account_login"),
    path("logout/", views.account_logout, name="account_logout"),
]
