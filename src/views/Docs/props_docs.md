##\_\_**props** configuration

| prop          |       value        |
| :------------ | :----------------: |
| \_\_**props** | Array:[**config**] |

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

- text - **(BasicInput)**
- wysiwyg - **(BasicWysiwyg)**
- dropdown - **(Dropdown)**
- buttons - **(ButtonsController)**
- images - **(ImagesController)**
- group-fields - **(GroupFieldsController)**
- date-picker - **(BasicDatePicker)**

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

| prop            |     value      |
| :-------------- | :------------: |
| variants_group  |     Array      |
| related_options | [String, null] |

> **variants_group** - w przypadku konieczności pozwala doprecyzować dla których konfiguracji dana opcja jest dostępna
> **related_options** - w przypadku potrzeby przekazania dodatkowych opcji konfiguracyjnych dla danej propki należy uzupełnić o nazwe danej opcji oraz umieścić jej model w \_\_props_options

_**variants\_group**_

> Konfiguracja wariantów obywa sie za pomocą łaczenia par (klucz - wartość) poszczególnych **[config]** i wyłącznie \_\_**[type]**\_config.
> Dodatkowo z racji możliwości wspóldzielenia jednej propki z \_\_props via wiele konfiguracji możliwe jest łączenie variantów w grupy w przypadku gdy potrzebują one innych opcji konfiguracyjnych (przykłady poniżej).

e.g.

```
...
  {
    "prop": "custom_buttons",
    "type": "group-fields",
    "label": "custom buttons group",
    "__value": null,
    "_for": {
      "section_configs": [
        {
          "variants_group": [
            ["doc_type:static-page", "core_type:Universal", "variant:1"]
          ],
          "related_options": "custom_buttons_variant_1"
        },
        {
          "variants_group": [
            ["doc_type:static-page", "core_type:Universal", "variant:2"]
          ],
          "related_options": "custom_buttons_variant_2"
        }
      ],

      "tile_configs": null
    }
  }
...
```

##**Modele opcji**

_group-fields_

```

{
    "header": {
        "type": "text",
        "label": "group header"
    },
    "body": {
        "type": "wysiwyg",
        "label": "group body"
    }
}

```

> group-fields są najbardziej uniwersalnym controllerem pozwalającym wyklikać "grupy zachowań" i skonfigurować wg potrzeb/makiet np.:

```
  "form": {
    "type": "group-fields",
    "label": "custom form group",
    "__value": null,
    "_for": {
      "section_configs": [
        ["Universal"],
        {
          "Universal": {
            "fields": {
              "label": {
                "type": "text",
                "label": "input label"
              },
              "type": {
                "type": "dropdown",
                "label": "set input type",
                "options": [
                  {
                    "label": "text",
                    "value": "text"
                  },
                  {
                    "label": "textarea",
                    "value": "textarea"
                  },
                  {
                    "label": "email",
                    "value": "email"
                  },
                  {
                    "label": "password",
                    "value": "password"
                  },
                  {
                    "label": "telephone",
                    "value": "telephone"
                  }
                ]
              },
              "required": {
                "type": "dropdown",
                "label": "is required",
                "options": [
                  {
                    "label": "yes",
                    "value": true
                  },
                  {
                    "label": "no",
                    "value": false
                  }
                ]
              }
            },
            "group_rules": {
              "max": null
            }
          }
        }
      ],
      "tile_configs": null
    },
    "_dependent": ["core_config", ["core_type"]]
  }

```

_Przykład obrazujący jak za pomocą group-fields utworzyć przykładowe pola do skonfigurowania formularza._

```
  "accordion": {
    "type": "group-fields",
    "label": "custom accordion group",
    "__value": null,
    "_for": {
      "section_configs": [
        ["Universal"],
        {
          "Universal": {
            "fields": {
              "head": {
                "type": "text",
                "label": "set accordion head"
              },
              "body": {
                "type": "wysiwyg",
                "label": "set accordion body"
              }
            },
            "group_rules": {
              "max": null
            }
          }
        }
      ],
      "tile_configs": null
    },
    "_dependent": ["core_config", ["core_type"]]
  }
```

_Przykład obrazujący jak za pomocą group-fields utworzyć przykładowe pola do skonfigurowania akordeonów._

```
  "buttons": {
    "type": "group-fields",
    "label": "custom buttons group",
    "__value": null,
    "_for": {
      "section_configs": [
        ["Universal"],
        {
          "Universal": {
            "fields": {
              "label": {
                "type": "text",
                "label": "set label"
              },
              "url": {
                "type": "text",
                "label": "set url"
              },
              "type": {
                "type": "dropdown",
                "label": "link type",
                "options": [
                  { "label": "internal", "value": "internal" },
                  { "label": "external", "value": "external" }
                ]
              },
              "decorator": {
                "type": "dropdown",
                "label": "icon (optional)",
                "options": [
                  { "label": "szczalka right", "value": "arrow-right" },
                  { "label": "szczalka left", "value": "arrow-left" }
                ]
              },
              "rtl": {
                "type": "switcher",
                "label": "RTL (optional)",
                "options": {
                  "default_state": false
                }
              }
            },
            "group_rules": {
              "max": 2
            }
          }
        }
      ],
      "tile_configs": null
    },
    "_dependent": ["core_config", ["core_type"]]
  }
```

_Przykład obrazujący jak za pomocą group-fields utworzyć przykładowe pola do skonfigurowania grup buttonów._

---

_date-picker_

```


{
    "mode": "range",
    "wrap": true,
    "inline": true,
    "enableTime": false,
    "noCalendar": false
}


```

_buttons_

```


{
    "max": 1,
    "decorator": true,
    "decorators": ["arrow-righ"],
    "rtl": true
}



```
