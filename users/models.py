from django.contrib.auth.models import AbstractUser
from django.db import models


class HomeUser(AbstractUser):
    # Поля модели по умолчанию:
    # "id"
    # "last_login"
    # "is_superuser" - Обозначает, что этот пользователь имеет все разрешения,
    #                  не назначая их явно.
    # "username"
    # "password"
    # "first_name"
    # "last_name"
    # "is_staff" - Определяет, может ли пользователь войти на этот сайт как администратор.
    # "is_active"
    # "date_joined"
    # "groups" - Группы, к которым принадлежит этот пользователь.
    #           Пользователь получит все разрешения, предоставленные каждой из его групп
    # "user_permissions" - Конкретные разрешения для этого пользователя
    photo = models.ImageField(
        upload_to="users/",
        verbose_name="Фотография",
        null=True,
    )
    email = models.EmailField(unique=True, verbose_name="Почта клиента")
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    comment = models.CharField(
        max_length=15, blank=True, null=True, verbose_name="Коммантарий"
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = [
        "username",
    ]

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = "Получатель"
        verbose_name_plural = "Получатели"
        ordering = ["id", "username"]
