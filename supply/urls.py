from django.urls import path
from . import views
from supply.apps import SupplyConfig


app_name = SupplyConfig.name

urlpatterns = [
    path('home/', views.home, name='home'),
    path('contacts/', views.contacts, name='contacts'),
    path(f'{SupplyConfig.name}/', views.contacts, name=f'{SupplyConfig.name}')
]
