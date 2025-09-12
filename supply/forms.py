from django import forms
from .models import SupplySwitch


class CreateSwitchForm(forms.ModelForm):
    class Meta:
        model = SupplySwitch
        fields = [
            "name",
            "adres_board",
            "adres_registr",
            "location",
            "image",
            "connected",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["name"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Название переключателя"}
        )
        self.fields["adres_board"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Адрес платы целым числом: 40"}
        )
        self.fields["adres_registr"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Регистр целым числом: 21"}
        )
        self.fields["location"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Макс, Кладовая, Кухня, Корридор"}
        )
        self.fields["image"].widget.attrs.update({"class": "form-control"})
        self.fields["connected"].widget.attrs.update({"class": "form-check-input"})


class UpdateForm(forms.ModelForm):
    class Meta:
        model = SupplySwitch
        fields = [
            "name",
            "adres_board",
            "adres_registr",
            "location",
            "image",
            "connected",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["name"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Название переключателя"}
        )
        self.fields["adres_board"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Адрес платы целым числом: 40"}
        )
        self.fields["adres_registr"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Регистр целым числом: 21"}
        )
        self.fields["location"].widget.attrs.update(
            {"class": "form-control", "placeholder": "Макс, Кладовая, Кухня, Корридор"}
        )
        self.fields["image"].widget.attrs.update({"class": "form-control"})
        self.fields["connected"].widget.attrs.update({"class": "form-check-input"})
