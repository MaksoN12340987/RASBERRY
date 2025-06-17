from django.db import models

# from supply.models import SupplySwitch


class SupplySwitch(models.Model):
    name = models.CharField(max_length=200, verbose_name="Наименование", unique=True)
    adres_board = models.IntegerField(help_text="0x40", verbose_name="Адресс платы")
    adres_registr = models.IntegerField(
        help_text="0x20", verbose_name="Адресс регистра"
    )
    image = models.ImageField(
        upload_to="supply/media/photo", verbose_name="Фотография", null=True
    )

    def __str__(self) -> str:
        return f"{self.name}"

    class Meta:
        verbose_name = "устройство"
        verbose_name_plural = "устройства"
        ordering = ["name"]
