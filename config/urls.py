from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from api.apps import ApiConfig
from supply.apps import SupplyConfig
from users.apps import UsersConfig

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        f"",
        include(f"{SupplyConfig.name}.urls", namespace=f"{SupplyConfig.name}"),
    ),
    path(
        f"{UsersConfig.name}/",
        include(f"{UsersConfig.name}.urls", namespace=f"{UsersConfig.name}"),
    ),
    path(
        f"{ApiConfig.name}/",
        include(f"{ApiConfig.name}.urls", namespace=f"{ApiConfig.name}"),
    ),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
