from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from supply.apps import SupplyConfig

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        f"{SupplyConfig.name}/",
        include(f"{SupplyConfig.name}.urls", namespace=f"{SupplyConfig.name}"),
    ),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
