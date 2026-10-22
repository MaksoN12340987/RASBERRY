from django.core.mail import send_mail

class EmailHandler():
    user_email = ''
    subject = 'Добро пожаловать в наш сервис'
    
    def welcome_email(
        self,
        message:str = "Спасибо, что зарегистрировались в нашем сервисе!",
        from_email:str = "gorscheneow2018@yandex.ru",
        recipient_list:list = [user_email]
        ):

        send_mail(self.subject, message, from_email, recipient_list)
    
    def stat_email(
        self,
        message:str = "Проверьте питание, возможно пропадание высокого напряжения",
        from_email:str = "gorscheneow2018@yandex.ru",
        recipient_list:list = ["koroliishyt@outlook.com"]
        ):
        self.subject = "СЕРВЕР ЗАПУСКАЕТСЯ!"

        send_mail(self.subject, message, from_email, recipient_list)
