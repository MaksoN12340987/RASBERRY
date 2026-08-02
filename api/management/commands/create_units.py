# from django.core.management.base import BaseCommand

# from mailings.models import Message
# from users.models import MailingRecipient


# class Command(BaseCommand):
#     help = "Delete test data to the databases"

#     def handle(self, *args, **kwargs):
#         # Creating users
#         user_1 = MailingRecipient(
#             id=1,
#             email="koroliishyt@gmail.com",
#             username="User_1",
#             first_name="User_1",
#             last_name="last_name_1",
#             is_superuser=False,
#         )
#         user_2 = MailingRecipient(
#             id=2,
#             email="andrianov_maksim@outlook.com",
#             username="user_2",
#             first_name="User_2",
#             last_name="last_name_2",
#             is_superuser=False,
#         )
#         user_3 = MailingRecipient(
#             id=3,
#             email="user@domen.com",
#             username="user_3",
#             first_name="User_3",
#             last_name="last_name_3",
#             is_superuser=False,
#         )

#         user_1.set_password("12345678")
#         user_2.set_password("12345678")
#         user_3.set_password("12345678")

#         user_1.save()
#         user_2.save()
#         user_3.save()

#         print(f"Успешно создали пользователей:\n{user_1}\n{user_2}\n{user_3}")

#         # Creating mailing lists
#         message_1 = Message(
#             id=1,
#             subject="Заполните профиль",
#             content="""Здравствуйте уважаемый пользователь, заполните свой профиль,
#             чтобы мы могли предлагать вам больше индивидуального контента!

#             С уважением команда интернет-магазина)""",
#         )
#         message_2 = Message(
#             id=2,
#             subject="Посмотрите новые товары!",
#             content="Загляните наш магазин и зацените новую каллекцию)",
#             attached_file="newsletter/4169390-middle.png",
#         )
#         message_3 = Message(
#             id=3,
#             subject="Hello World!",
#             content="Привет мир)",
#             attached_file="newsletter/thumbnail-pink-blue.webp",
#         )

#         message_1.save()
#         message_2.save()
#         message_3.save()

#         print(f"Успешно создали сообщения:\n{message_1}\n{message_2}\n{message_3}")
