import logging

from django.urls import reverse_lazy
from django.views.generic import (
    CreateView,
    DetailView,
    ListView,
    UpdateView,
    DeleteView,
)
from django.contrib.auth.views import LoginView, LogoutView
from django.core.mail import send_mail
from django.contrib.auth import login

from .models import BaseUser
from .forms import UserCreateForm, CustomAuthenticationForm

logger_views_users = logging.getLogger(__name__)
file_handler = logging.FileHandler(f"log/{__name__}.log", mode="a", encoding="UTF8")
file_formatter = logging.Formatter(
    "\n%(asctime)s %(levelname)s %(name)s \n%(funcName)s %(lineno)d: \n%(message)s",
    datefmt="%H:%M:%S %d-%m-%Y",
)
file_handler.setFormatter(file_formatter)
logger_views_users.addHandler(file_handler)
logger_views_users.setLevel(logging.INFO)


class UsersCreate(CreateView):
    model = BaseUser
    form_class = UserCreateForm
    template_name = "users/create.html"
    success_url = reverse_lazy("users:login")

    def form_valid(self, form):
        user = form.save()
        login(self.request, user)
        self.send_welcome_email(user.email)
        return super().form_valid(form)

    def send_welcome_email(self, user_email):
        logger_views_users.info(user_email)
        subject = "Добро пожаловать в наш сервис"
        message = "Спасибо, что зарегистрировались в нашем сервисе!"
        from_email = "gorscheneow2018@yandex.ru"
        recipient_list = [user_email]

        logger_views_users.info(recipient_list)

        send_mail(subject, message, from_email, recipient_list)


class Login(LoginView):
    model = BaseUser
    form_class = CustomAuthenticationForm
    template_name = "users/log_in.html"


class Logout(LogoutView):
    model = BaseUser
    template_name = "users/log_out.html"
    success_url = reverse_lazy("users:login")


class Profile(DetailView):
    model = BaseUser
    template_name = "users/profile.html"
    context_object_name = "user"
