from django.db import models


class SupplySwitch(models.Model):
    LOCATION_CHOICES = [
        ("коридор", "switch коридор"),
        ("Макс", "switch Макс"),
        ("кухня", "switch кухня"),
        ("остальные", "switch остальные"),
    ]
    location = models.CharField(
        choices=LOCATION_CHOICES,
        default="коридор",
        help_text="Где находится",
        verbose_name="Группа устройств",
        null=True,
    )

    name = models.CharField(max_length=100, verbose_name="Наименование", unique=True)
    adres_board = models.IntegerField(help_text="40", verbose_name="Адресс платы")
    adres_registr = models.IntegerField(help_text="20", verbose_name="Адресс регистра")
    
    image = models.ImageField(upload_to="media", verbose_name="Иконка", null=True)
    on_off = models.IntegerField(help_text="on_off", verbose_name="Статус", default=0)
    connected = models.BooleanField(
        help_text="Подключено ли?", verbose_name="Подключено", default=True
    )

    def __str__(self) -> str:
        return f"{self.name}"

    class Meta:
        verbose_name = "устройство"
        verbose_name_plural = "устройства"
        ordering = ["name"]
