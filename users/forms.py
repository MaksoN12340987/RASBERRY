from django.contrib.auth.forms import (
    AuthenticationForm,
    UserChangeForm,
    UserCreationForm,
)

from .models import HomeUser


# Форма регистрации
class UserCreateForm(UserCreationForm):
    class Meta:
        model = HomeUser
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "photo",
            "comment",
            "phone_number",
            "password1",
            "password2",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите имя пользователя",
            }
        )
        self.fields["first_name"].widget.attrs.update(
            {"class": "form-control rounded-2 mb-2", "placeholder": "Введите ваше имя"}
        )
        self.fields["last_name"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите вашу фамилию",
            }
        )
        self.fields["email"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите вашу почту",
            }
        )
        self.fields["comment"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите страну, где вы находитесь",
            }
        )
        self.fields["photo"].widget.attrs.update(
            {
                "class": "input-group rounded-2 mb-2",
            }
        )
        self.fields["phone_number"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-4",
                "placeholder": "Введите номер телефона",
            }
        )
        self.fields["password1"].widget.attrs.update(
            {"class": "form-control rounded-2 mb-2", "placeholder": "Придумайте пароль"}
        )
        self.fields["password2"].widget.attrs.update(
            {"class": "form-control rounded-2 mb-5", "placeholder": "Повторите пароль"}
        )


# Форма авторизации
class AuthForm(AuthenticationForm):
    class Meta:
        model = HomeUser
        fields = ["username", "password"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update(
            {
                "class": "form-control rounded-2",
                "placeholder": "Введите имя пользователя",
            }
        )
        self.fields["password"].widget.attrs.update(
            {"class": "form-control rounded-2", "placeholder": "Введите пароль"}
        )


class RedactProfileForm(UserChangeForm):
    class Meta:
        model = HomeUser
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "photo",
            "comment",
            "phone_number",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите имя пользователя",
            }
        )
        self.fields["first_name"].widget.attrs.update(
            {"class": "form-control rounded-2 mb-2", "placeholder": "Введите ваше имя"}
        )
        self.fields["last_name"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите вашу фамилию",
            }
        )
        self.fields["email"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите вашу почту",
            }
        )
        self.fields["comment"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-2",
                "placeholder": "Введите страну, где вы находитесь",
            }
        )
        self.fields["phone_number"].widget.attrs.update(
            {
                "class": "form-control rounded-2 mb-4",
                "placeholder": "Введите номер телефона",
            }
        )
        self.fields["photo"].widget.attrs.update(
            {
                "class": "input-group rounded-2 mb-2",
            }
        )
