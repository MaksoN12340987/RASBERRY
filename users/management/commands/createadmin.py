from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any) -> str | None:
        email = input("Введите email:\n")
        name = input("Введите имя:\n")
        surname = input("Введите фамилию:\n")
        passwd = input("Введите пароль:\n")

        User = get_user_model()
        user = User.objects.create(email=email, first_name=name, last_name=surname)

        user.set_password(passwd)

        user.is_staff = True
        user.is_superuser = True
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created admin user with email {user.email}"
            )
        )
