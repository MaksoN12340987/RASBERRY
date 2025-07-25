from django import forms
from .models import SupplySwitch


class CreatePostForm(forms.ModelForm):
    class Meta:
        model = SupplySwitch
        fields = ["name", "adres_board", "adres_registr", "location", "image", "connected"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["name"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите имя"}
        )
        self.fields["adres_board"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["adres_registr"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["location"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["image"].widget.attrs.update({"class": "form-control"})
        self.fields["connected"].widget.attrs.update(
            {"class": "form-check-input"}
        )

    # def clean(self):  # type: ignore
    #     data_array = super().clean()
    #     title = data_array.get("title")
    #     content = data_array.get("content")

    #     if content == title:
    #         self.add_error("content", "Заголовок и описание одинаковые")

    #     if len(content) < 40:  # type: ignore
    #         self.add_error("content", "Скудное описание(")

    #     repetitions = 0
    #     item = ""
    #     for i, value in enumerate(content):  # type: ignore
    #         if i > 0:
    #             if item == value:
    #                 repetitions += 1
    #             item = value
    #         elif i == 0:
    #             item = value

    #     if repetitions > 4:
    #         self.add_error("content", "Странно много повторяющихся символов...")


class UpdateForm(forms.ModelForm):
    class Meta:
        model = SupplySwitch
        fields = ["name", "adres_board", "adres_registr", "location", "image", "connected"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["name"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите имя"}
        )
        self.fields["adres_board"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["adres_registr"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["location"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Введите фамилию"}
        )
        self.fields["image"].widget.attrs.update({"class": "form-control"})
        self.fields["connected"].widget.attrs.update(
            {"class": "form-check-input"}
        )
