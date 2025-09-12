from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import BaseUser


# Форма регистрации
class UserCreateForm(UserCreationForm):
    class Meta:
        model = BaseUser
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "preview",
            "password1",
            "password2",
            "groups",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["username"].widget.attrs.update(
            {
                "class": "form-control rounded-2",
                "placeholder": "Введите имя пользователя",
            }
        )
        self.fields["first_name"].widget.attrs.update(
            {"class": "form-control mt-3 rounded-2", "placeholder": "Введите ваше имя"}
        )
        self.fields["last_name"].widget.attrs.update(
            {
                "class": "form-control mb-4 rounded-2",
                "placeholder": "Введите вашу фамилию",
            }
        )
        self.fields["email"].widget.attrs.update(
            {"class": "form-control rounded-2", "placeholder": "Введите вашу почту"}
        )
        self.fields["phone_number"].widget.attrs.update(
            {
                "class": "form-control mb-4 rounded-2",
                "placeholder": "Введите номер телефона",
            }
        )
        self.fields["preview"].widget.attrs.update(
            {
                "class": "input-group mb-3 rounded-2",
                "placeholder": "Введите номер телефона",
            }
        )
        self.fields["groups"].widget.attrs.update(
            {
                "class": "form-select mb-4 rounded-2",
                "placeholder": "Введите номер телефона",
            }
        )
        self.fields["password1"].widget.attrs.update(
            {"class": "form-control mb-4 rounded-2", "placeholder": "Придумайте пароль"}
        )
        self.fields["password2"].widget.attrs.update(
            {"class": "form-control mb-4 rounded-2", "placeholder": "Повторите пароль"}
        )


# Форма авторизации
class CustomAuthenticationForm(AuthenticationForm):
    class Meta:
        model = BaseUser
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
