##\_\_**[type]**\_config configuration

| prop                   |       value        |
| :--------------------- | :----------------: |
| \_\_**[type]**\_config | Array:[**config**] |

**[config]**

| prop      |     value      |
| :-------- | :------------: |
| prop      |     String     |
| label     |     String     |
| type      |     String     |
| \_\_value | [null, String] |
| \_for     |      JSON      |
| hidden    |    Boolean     |

---

e.g.

`...
{
prop: core_type,
label: Typ sekcji,
type: dropdown,
__value: null,
_for: {
    section_configs: [ ... ],
    tile_configs: [ ... ]
},
hidden: false
}
...`

---

_**prop:**_

> Nazwa funkcyjna pod jaką rejestrujemy dany config (powinna być unikalna).

_**label:**_

> Nazwa \***\*[prop]\*\*** zrozumiała dla użytkownika

_**type:**_

> Każdy typ ma controller (podany w nawiasie), zawierający logike przypisywania wartości do ww. propki **[ prop ]**.

- dropdown - **(Dropdown)** 

> wartościami poszczególonych kontrolerów stają się skonfigurowane pola w propce **\_for** (opis poniżej).

**\_\_value:**

> Domyślnie powinien być to null, można jednak wpisać inną domyślną wartość, o ile jest ona zawarta w configu **\_for**

---

**\_for:**

> Pozwala rozdzielić wartości dla poszczególnych typów. Dla wartości null oznacza pojawienie sie **[config_name]** dla wszystkich konfiguracji _(chyba...)_.

| prop            |      value      |
| :-------------- | :-------------: |
| section_configs | Array: [option] |
| tile_configs    | Array: [option] |

`...
"_for": {
 section_configs: [ ... ],
 tile_configs: [ ... ]
}
...`

> Nazwy section configs oraz tile configs są predefiniowane i to nimi należy sie posługiwać konfigurując odpowiednio sekcję lub kafelek **[!!!]**

---

**[ option ]**

| prop     |         value          |
| :------- | :--------------------: |
| label    |         String         |
| value    | [String, Int, Boolean] |
| variants |     [Array , null]     |

> **label** - nazwa wyświetlana użytkownikowi
> **value** - wartość dla danej opcji
> **variants** - w przypadku konieczności pozwala doprecyzować dla których konfiguracji dana opcja jest dostępna

_**variants**_

> Konfiguracja wariantów obywa sie za pomocą łaczenia par (klucz - wartość) poszczególnych **[config]** i wyłącznie \_\_**[type]**\_config.

e.g.

```
...
prop: variant,
label: Wariant,
...
section_configs: [
        {
          label: variant 1,
          value: 1,
          variants: [
            [doc_type:static-page, core_type:Universal],
            [doc_type:static-page, core_type:section-slider]
          ]
        },
        ...
      ],
...
```

> zapis ` [doc_type:static-page, core_type:Universal]` oznacza ze dana opcja dostępa jest w przypadku kiedy doc_type (**[config]**) posiada \_\_value "static-page" oraz core_type (**[config]**) wartość Universal
> variants z wartością null oznaczać bedzie opcje dostępną dla wszystkich możliwych konfiguracji
