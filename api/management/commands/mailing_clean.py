# from django.core.management.base import BaseCommand

# from mailings.models import AttemptSend, Message, Newsletter


# class Command(BaseCommand):
#     help = "Delete test data to the databases"

#     def handle(self, *args, **kwargs):
#         messages = Message.objects.all()

#         for message in messages:
#             message.delete()
#             if message:
#                 self.stdout.write(
#                     self.style.SUCCESS(f"Successfully delete: {message.subject}")
#                 )
#             else:
#                 self.stdout.write(self.style.WARNING("Student already not exists"))

#         newsletters = Newsletter.objects.all()

#         for newsletter in newsletters:
#             newsletter.delete()
#             if newsletter:
#                 self.stdout.write(
#                     self.style.SUCCESS(f"Successfully delete: {newsletter.message}")
#                 )
#             else:
#                 self.stdout.write(self.style.WARNING("Student already not exists"))

#         attemptsends = AttemptSend.objects.all()

#         for attemptsend in attemptsends:
#             attemptsend.delete()
#             if attemptsend:
#                 self.stdout.write(
#                     self.style.SUCCESS(
#                         f"Successfully delete: {attemptsend.news_letter}"
#                     )
#                 )
#             else:
#                 self.stdout.write(self.style.WARNING("Student already not exists"))
