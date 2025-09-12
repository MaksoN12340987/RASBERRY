import logging

from django.contrib.auth import login
from django.contrib.auth.mixins import (LoginRequiredMixin,
                                        PermissionRequiredMixin)
from django.contrib.auth.views import LoginView, LogoutView
from django.core.mail import send_mail
from django.http import HttpResponse, HttpResponseForbidden

from django.urls import reverse_lazy
from django.views.generic import CreateView, ListView, UpdateView

from .forms import AuthForm, RedactProfileForm, UserCreateForm
from .models import HomeUser

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
    model = HomeUser
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


class UsersList(LoginRequiredMixin, PermissionRequiredMixin, ListView):
    model = HomeUser
    template_name = "users/list.html"
    context_object_name = "users"
    permission_required = "users.view_baseuser"


class Login(LoginView):
    model = HomeUser
    form_class = AuthForm
    template_name = "users/log_in.html"


class Logout(LogoutView):
    model = HomeUser
    template_name = "users/log_out.html"


class UpdateProfile(LoginRequiredMixin, UpdateView):
    model = HomeUser
    form_class = RedactProfileForm
    template_name = "users/profile.html"
    context_object_name = "user"

    def post(self, request, *args, **kwargs) -> HttpResponse:
        if not request.user.has_perm("change_baseuser"):
            return HttpResponseForbidden(
                "У вас нет прав для обновления данных пользователя."
            )

        return super().post(request, *args, **kwargs)

    success_url = reverse_lazy("users:login")
