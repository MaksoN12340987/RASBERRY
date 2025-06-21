from django.db import models

# from supply.models import SupplySwitch


class SupplySwitch(models.Model):
    name = models.CharField(max_length=100, verbose_name="Наименование", unique=True)
    adres_board = models.IntegerField(help_text="0x40", verbose_name="Адресс платы")
    adres_registr = models.IntegerField(
        help_text="0x20", verbose_name="Адресс регистра"
    )
    group = models.CharField(
        help_text="Где находится", verbose_name="Группа устройств", null=True
    )
    image = models.ImageField(
        upload_to="supply/media/photo", verbose_name="Иконка", null=True
    )
    connected = models.BooleanField(
        help_text="Подключено ли?", verbose_name="Подключено", default=True
    )

    def __str__(self) -> str:
        return f"{self.name}"

    class Meta:
        verbose_name = "устройство"
        verbose_name_plural = "устройства"
        ordering = ["name"]
