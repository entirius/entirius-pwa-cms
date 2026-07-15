
API ContentDB
=============

GET Languages
-------------

Returns a list of defined languages.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "iso3": "POL",
          "iso2": "PL"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 6,
        "pages": 1,
        "records": 1
      }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/languages/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/languages/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/languages/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/languages/``

GET Categories
--------------

Returns a list of defined categories with optional filtering by language.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "name": "Technology",
          "url_key": "technology",
          "language": "EN",
          "published_posts_count": 15
        },
        {
          "uid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "name": "Technologia",
          "url_key": "technologia",
          "language": "PL",
          "published_posts_count": 8
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "pages": 1,
        "records": 2
      }
    }

**Query Parameters**:
    - ``language``: Filter by language ISO2 code (e.g., ``?language=pl``). If not provided, returns all categories.
    - ``access_rights``: (Public endpoint only) Filter by access rights levels (e.g., ``?access_rights=1,2``)
    - ``page``: Page number
    - ``limit``: Number of items per page

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/categories/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/categories/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/categories/``
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/categories/?language=pl``
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/categories/?language=en``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/categories/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/categories/?language=pl``

GET Category
------------

Returns data about a specific category by UID.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Technology",
        "url_key": "technology",
        "language": "EN",
        "published_posts_count": 15
      }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/categories/<uid>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/categories/<uid>/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

POST Category
-------------

Allows creation of a new category. Authentication required.

**Fields**:
    - ``name``: (string, required) Category name
    - ``language``: (string, optional) Language ISO2 code (e.g., "PL", "EN")
    - ``url_key``: (string, optional) URL-friendly key; auto-generated from name if not provided

**Request Example**:

.. code-block:: json

    {
      "name": "Technologia",
      "language": "PL",
      "url_key": "technologia"
    }

**Response Example**:

.. code-block:: json

    {
      "meta": {
        "status": "CREATED",
        "message": ""
      },
      "data": {
        "uid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Technologia",
        "url_key": "technologia",
        "language": "PL",
        "published_posts_count": 0
      }
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/categories/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"name": "Technology", "language": "EN"}' -X POST {{<apiurl>}}api-admin/contentdb/v1/categories/``

PUT Category
------------

Allows modification of an existing category. Authentication required.

**Fields**:
    - ``name``: (string, optional) Category name
    - ``language``: (string, optional) Language ISO2 code (e.g., "PL", "EN")
    - ``url_key``: (string, optional) URL-friendly key

**Request Example**:

.. code-block:: json

    {
      "name": "Updated Technology",
      "language": "EN",
      "url_key": "updated-technology"
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"name": "Updated Name", "language": "PL"}' -X PUT {{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

DELETE Category
---------------

Allows deletion of a category. Authentication required.

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -X DELETE {{<apiurl>}}api-admin/contentdb/v1/categories/<uid>/``

GET Image Tags
--------------

Returns a list of defined image tags.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "slug": "landscape",
          "label": "Landscape"
        },
        {
          "slug": "portrait",
          "label": "Portrait"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "pages": 1,
        "records": 2
      }
    }

**Query Parameters**:
    - ``page``: Page number
    - ``limit``: Number of items per page

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/image-tags/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/image-tags/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/image-tags/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/image-tags/``

GET Image Tag
-------------

Returns data about a specific image tag by slug.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "slug": "landscape",
        "label": "Landscape"
      }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/image-tags/<slug>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/image-tags/<slug>/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

POST Image Tag
--------------

Allows creation of a new image tag. Authentication required.

**Fields**:
    - ``slug``: (string, required) Unique tag identifier (URL-friendly)
    - ``label``: (string, required) Display name for the tag

**Request Example**:

.. code-block:: json

    {
      "slug": "landscape",
      "label": "Landscape"
    }

**Response Example**:

.. code-block:: json

    {
      "meta": {
        "status": "CREATED",
        "message": ""
      },
      "data": {
        "slug": "landscape",
        "label": "Landscape"
      }
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/image-tags/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"slug": "landscape", "label": "Landscape"}' -X POST {{<apiurl>}}api-admin/contentdb/v1/image-tags/``

PUT Image Tag
-------------

Allows modification of an existing image tag. Authentication required.

**Fields**:
    - ``slug``: (string, optional) Unique tag identifier
    - ``label``: (string, optional) Display name for the tag

**Request Example**:

.. code-block:: json

    {
      "label": "Updated Landscape"
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"label": "Updated Landscape"}' -X PUT {{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

DELETE Image Tag
----------------

Allows deletion of an image tag. Authentication required.

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -X DELETE {{<apiurl>}}api-admin/contentdb/v1/image-tags/<slug>/``

GET Images
----------

Returns a list of images with their associated tags.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "image": "/media/image/example.jpg",
          "width": 1920,
          "height": 1080,
          "set": [
            {
              "source": "/media/thumbnails/example_thumb.jpg",
              "width": 300,
              "height": 200
            }
          ],
          "tags": [
            {
              "slug": "landscape",
              "label": "Landscape"
            }
          ],
          "meta": {},
          "created_at": "2024-01-15T10:30:00Z",
          "updated_at": "2024-01-15T10:30:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "pages": 1,
        "records": 1
      }
    }

**Query Parameters**:
    - ``page``: Page number
    - ``limit``: Number of items per page
    - ``tags``: Filter by tag slug (can be multiple)

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/images/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/images/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/images/``
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/images/?tags=landscape``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/images/``

GET Image
---------

Returns data about a specific image by UID.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "image": "/media/image/example.jpg",
        "width": 1920,
        "height": 1080,
        "set": [
          {
            "source": "/media/thumbnails/example_thumb.jpg",
            "width": 300,
            "height": 200
          }
        ],
        "tags": [
          {
            "slug": "landscape",
            "label": "Landscape"
          }
        ],
        "meta": {},
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/images/<uid>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/images/<uid>/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

POST Image
----------

Allows creation of a new image with tags. Authentication required. Image can be uploaded as base64 encoded string or multipart form data.

**Fields**:
    - ``image``: (base64 string or file, required) Image data
    - ``tags``: (array, optional) List of tags with ``slug`` and ``label`` fields. Tags will be created if they don't exist.
    - ``meta``: (json, optional) Additional metadata

**Request Example (JSON with base64)**:

.. code-block:: json

    {
      "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
      "tags": [
        {
          "slug": "landscape",
          "label": "Landscape"
        },
        {
          "slug": "nature",
          "label": "Nature"
        }
      ],
      "meta": {
        "description": "Beautiful landscape photo"
      }
    }

**Response Example**:

.. code-block:: json

    {
      "meta": {
        "status": "CREATED",
        "message": ""
      },
      "data": {
        "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "image": "/media/image/example.jpg",
        "width": 1920,
        "height": 1080,
        "set": [],
        "tags": [
          {
            "slug": "landscape",
            "label": "Landscape"
          },
          {
            "slug": "nature",
            "label": "Nature"
          }
        ],
        "meta": {
          "description": "Beautiful landscape photo"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/images/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"image": "data:image/jpeg;base64,...", "tags": [{"slug": "landscape", "label": "Landscape"}]}' -X POST {{<apiurl>}}api-admin/contentdb/v1/images/``

PUT Image
---------

Allows modification of an existing image. Authentication required. You can update the image file, tags, or metadata.

**Fields**:
    - ``image``: (base64 string or file, optional) New image data
    - ``tags``: (array, optional) List of tags with ``slug`` and ``label`` fields. This will replace all existing tags. Tags are referenced by slug - if a tag with the given slug already exists in the system, it will be reused; otherwise a new tag will be created.
    - ``meta``: (json, optional) Additional metadata

**Request Example (updating tags only)**:

.. code-block:: json

    {
      "tags": [
        {
          "slug": "portrait",
          "label": "Portrait"
        },
        {
          "slug": "nature",
          "label": "Nature"
        }
      ]
    }

**Request Example (updating tags and metadata)**:

.. code-block:: json

    {
      "tags": [
        {
          "slug": "portrait",
          "label": "Portrait"
        }
      ],
      "meta": {
        "description": "Updated description"
      }
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"tags": [{"slug": "portrait", "label": "Portrait"}]}' -X PUT {{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

**Note**: PATCH method is also supported and works identically to PUT for this endpoint. Both methods will replace all existing tags with the provided ones when ``tags`` field is included in the request.

DELETE Image
------------

Allows deletion of an image. Authentication required. This will also delete the physical image file and all thumbnails.

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -X DELETE {{<apiurl>}}api-admin/contentdb/v1/images/<uid>/``

GET Routes
-----------

Returns a list of defined routes.

.. code-block:: json

    {
        "meta": {
            "status": "OK",
            "message": ""
        },
        "data": [
            {
                "url": "ala",
                "label": "",
                "placement": "top",
                "draft": null
            },
            {
                "url": "alb",
                "label": "",
                "placement": "top",
                "draft": null
            },
            {
                "url": "bla",
                "label": "",
                "placement": "top",
                "draft": null
            }
        ]
    }

**Parameter**:
    - ``placement``: string

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/routes/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/routes/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/routes/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/routes/``

GET Route
---------

Returns data about a specific route.

.. code-block:: json

    {
        "meta": {
            "status": "OK",
            "message": ""
        },
        "data": {
            "url": "ala",
            "label": "",
            "placement": "top",
            "draft": null
        }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/routes/<url>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/routes/<url>/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/routes/<url>/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/routes/<url>/``

POST Route
----------

Allows creation of a new route.

**Fields**:
    - ``url``: string
    - ``label``: string
    - ``placement``: enum

Defined values for field ``placement``:
    - "top"
    - "bottom"

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/routes/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -X POST {{<apiurl>}}api-admin/contentdb/v1/routes/``

PUT Route
---------

Allows modification of a route.

**Fields**:
    - ``url``: string
    - ``label``: string
    - ``placement``: enum

Defined values for field ``placement``:
    - "top"
    - "bottom"

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/routes/<url>/``

**Example Request**:
    - ``curl -H "Authorization: Bearer <access_token>" -X POST {{<apiurl>}}api-admin/contentdb/v1/routes/<url>/``

GET Content|Layout types list
-----------------------------

Returns a list of defined document types along with their attribute sets.

.. code-block:: json

    {
        "meta": {
            "status": "OK",
            "message": ""
        },
        "data": [
            {
                "slug": "blog-post",
                "label": "Blog post",
                "attribute_set": "post",
                "is_layout_extender": false,
                "attributes": [
                    {
                        "slug": "published",
                        "label": "Published",
                        "type": "datetime",
                        "is_filterable": false,
                        "is_searchable": false,
                        "is_comparable": true,
                        "allow_new_values": true
                    },
                    {
                        "slug": "author-name",
                        "label": "Author name",
                        "type": "txt",
                        "is_filterable": false,
                        "is_searchable": true,
                        "is_comparable": false,
                        "allow_new_values": true
                    },
                    {
                        "slug": "is-published",
                        "label": "Is published",
                        "type": "bool",
                        "is_filterable": true,
                        "is_searchable": false,
                        "is_comparable": true,
                        "allow_new_values": true
                    }
                ]
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 6,
            "pages": 1,
            "records": 1
        }
    }

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/content-types/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/content-types/``
    - ``{{<apiurl>}}api/contentdb/v1/layout-extender-types/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-types/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/content-types/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content-types/``

GET Content|Layout type
-----------------------

Returns information about a specific document type and its attributes.

**Address**:
    - ``{{<apiurl>}}api/contentdb/v1/content-types/<slug>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/content-types/<slug>/``
    - ``{{<apiurl>}}api/contentdb/v1/layout-extender-types/<slug>/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-types/<slug>/``

**Example Requests**:
    - ``curl -X GET {{<apiurl>}}api/contentdb/v1/content-types/<slug>/``
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content-types/<slug>/``


GET Content|Layout types permissions
-------------------------------------

Returns a list of document types that the currently logged-in user can edit. Authentication is required, and the response is not paginated.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "slug": "blog-post",
          "label": "Blog post",
          "actions": [
            "create"
          ]
        }
      ]
    }

**Address**:
    - ``{{<apiurl>}}api-admin/contentdb/v1/content-permissions/``
    - ``{{<apiurl>}}api-admin/contentdb/v1/layout-extenders-permissions/``

**Example Requests**:
    - ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content-permissions/``

GET Content|Layout list
-----------------------

Returns a paginated list of all documents. Allows filtering results using attributes.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "fab6644c-acf1-424b-8120-cd1ed2954f63",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:50.374547Z",
          "updated_at": "2022-05-18T11:49:01.520387Z",
          "content_set": "1c28bd1e-cfc2-4c58-9267-128607f35ab9",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "8d26a7d6-9d7c-4dca-bdaa-0b5e05944813",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:07.706592Z",
          "updated_at": "2022-05-18T11:49:01.517971Z",
          "content_set": "63213797-d83c-43b8-a2ef-d66bbe69a925",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "512acf7b-a6ba-439c-8106-acd46ae6b021",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:53:00.082721Z",
          "updated_at": "2022-05-18T11:49:01.515461Z",
          "content_set": "49db5a4d-a379-4f1d-8cc4-3b545732d373",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:52:16.996436Z",
          "updated_at": "2022-05-18T11:49:01.512557Z",
          "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 6,
        "pages": 1,
        "records": 4
      },
      "content_type": "blog-post"
    }

**Parameters**:

- ``page``: Number of the page to be displayed.
- ``limit``: Number of objects to be displayed per page.
- ``search``: Text search in searchable attributes.
- ``sort``: A list of attributes to sort by.
- ``order_by``: Order by a comparable attribute.
- ``<attribute_slug>``: Allows querying by predefined attribute.
- ``routes``: An array of strings.
- ``access_rights``: An array of integers representing access rights.
- ``created_at``: Date formatted in ISO 8601 format.
- ``created_at__gt``: (Greater than) Date formatted in ISO 8601 format.
- ``created_at__lt``: (Less than) Date formatted in ISO 8601 format.
- ``updated_at``: Date formatted in ISO 8601 format.
- ``updated_at__gt``: (Greater than) Date formatted in ISO 8601 format.
- ``updated_at__lt``: (Less than) Date formatted in ISO 8601 format.
- ``name``: String.
- ``name__contains``: String.
- ``language``: Language ISO 2 LIKE PL OR EN

Sorting Options
---------------

You can sort the returned results based on specific attributes.

**Sort Attributes**:

- ``-created_at``: Sort by creation date in descending order.
- ``created_at``: Sort by creation date in ascending order.
- ``-updated_at``: Sort by update date in descending order.
- ``updated_at``: Sort by update date in ascending order.

**Order in URL Matters**:

The order of attributes in the URL determines the sorting priority, with the first attribute being the primary criterion.

**Examples**:

- Sort by descending creation date and then ascending update date:
  ``/?sort=-created_at,updated_at``

- Sort by descending creation date and then descending update date:
  ``/?sort=-created_at,-updated_at``

Addresses
---------

**Content API Addresses**:

- ``{{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/``

**Layout Extender API Addresses**:

- ``{{<apiurl>}}api/contentdb/v1/layout-extender/<content_type_slug>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender/<content_type_slug>/``

Example Requests
----------------

- Basic request to retrieve content:
  ``curl -X GET {{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/``

- Authenticated request as an admin to retrieve content:
  ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/``


GET Content|Layout
------------------

Retrieve a single document based on its UID.

Response Example:

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
        "content": {},
        "meta": {},
        "attributes": {},
        "has_extension": false,
        "extension": {},
        "created_at": "2022-02-18T13:52:16.996436Z",
        "updated_at": "2022-05-18T11:49:01.512557Z",
        "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
        "content_set_members": {
          "PL": {
            "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
            "routes": []
          }
        },
        "content_type": "blog-post",
        "language": "PL",
        "name": "Test",
        "routes": [],
        "access_rights": [4],
        "is_published": false,
        "is_up_to_date": false
      }
    }

Endpoint Address:

- ``{{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender/<content_type_slug>/<uid>/``

Example Requests:

- Basic GET request to retrieve content:
  ``curl -X GET {{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/<uid>/``

- Authenticated GET request as an admin to retrieve content:
  ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/``

POST Content|Layout
-------------------

Create a new document.

Field Description:

- ``content``: (json) valid json
- ``meta``: (json) valid json
- ``extension``: (json) valid json
- ``attributes``: (dict) object representing attributes, may include both single values and lists
- ``name``: string
- ``language``: language iso2 (default: PL)
- ``content_set``: UID of an existing content_set; if left out, a new one will be created
- ``routes``: (list) a list of routes (strings)
- ``access_rights``: an array of int as a list of access rights

Endpoint Address:

- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender/<content_type_slug>/``

Example Request:

- Authenticated POST request as an admin to create content:
  ``curl -H "Authorization: Bearer <access_token>" -X POST {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/``



PUT Content|Layout
------------------

Allows modification of an existing document.

Field Description:

- ``content``: (json) valid json
- ``meta``: (json) valid json
- ``extension``: (json) valid json
- ``attributes``: (dict) object representing attributes, may include both single values and lists
- ``name``: string
- ``language``: language iso2 (default: PL)
- ``routes``: (list) a list of routes (strings)
- ``access_rights``: an array of int as a list of access rights

Endpoint Address:
- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender/<content_type_slug>/<uid>/``

Example Request:
- Authenticated PUT request as an admin to modify content:

``curl -H "Authorization: Bearer <access_token>" -X PUT {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/``

GET Published list
------------------

Returns a list of publications for documents. The list returns one (the most recent) publication per document. Filtering works similarly to GET Content.

Response Example:

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "fab6644c-acf1-424b-8120-cd1ed2954f63",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:50.374547Z",
          "updated_at": "2022-05-18T11:49:01.520387Z",
          "content_set": "1c28bd1e-cfc2-4c58-9267-128607f35ab9",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "8d26a7d6-9d7c-4dca-bdaa-0b5e05944813",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:07.706592Z",
          "updated_at": "2022-05-18T11:49:01.517971Z",
          "content_set": "63213797-d83c-43b8-a2ef-d66bbe69a925",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "512acf7b-a6ba-439c-8106-acd46ae6b021",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:53:00.082721Z",
          "updated_at": "2022-05-18T11:49:01.515461Z",
          "content_set": "49db5a4d-a379-4f1d-8cc4-3b545732d373",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:52:16.996436Z",
          "updated_at": "2022-05-18T11:49:01.512557Z",
          "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 6,
        "pages": 1,
        "records": 4
      },
      "content_type": "blog-post"
    }

Parameter Description:

- ``page``: number of the page to be displayed
- ``limit``: number of objects to be displayed per page
- ``sort``: (str) a list of attributes to sort by
- ``search``: (str) text search in searchable attributes
- ``<attribute_slug>``: (<attribute_type>) allows querying by predefined attribute
- ``routes``: an array of strings
- ``access_rights``: an array of int as a list of access rights
- ``created_at``: date formatted in ISO 8601 format
- ``created_at__gt``: (greater_than) date formatted in ISO 8601 format
- ``created_at__lt``: (lesser_than) date formatted in ISO 8601 format
- ``updated_at``: date formatted in ISO 8601 format


- ``sort``:

- Can sort by: -created_at, created_at, updated_at, -updated_at
- Order in URL matters (first sorter is most important...)
- Example: /?sort=-created_at,updated_at or /?sort=-created_at&sort=-updated_at

Endpoint URLs:

- ``{{<apiurl>}}api/contentdb/v1/published/<content_type_slug>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender-published/<content_type_slug>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-published/<content_type_slug>/``

Example Requests:

- ``curl -X GET {{<apiurl>}}api/contentdb/v1/published/<content_type_slug>/``
- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/``




GET Published
-------------

Retrieve a single publication based on its unique ID.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
        "content": {},
        "meta": {},
        "attributes": {},
        "has_extension": false,
        "extension": {},
        "created_at": "2022-02-18T13:52:16.996436Z",
        "updated_at": "2022-05-18T11:49:01.512557Z",
        "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
        "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
        },
        "content_type": "blog-post",
        "language": "PL",
        "name": "Test",
        "routes": [],
        "access_rights": [4],
        "is_published": false,
        "is_up_to_date": false
      }
    }

**Address:**

- ``{{<apiurl>}}api/contentdb/v1/published/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender-published/<content_type_slug>/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-published/<content_type_slug>/<uid>/``

**Sample Requests:**

- ``curl -X GET {{<apiurl>}}api/contentdb/v1/published/<content_type_slug>/<uid>/``
- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/<uid>/``



GET Published list for Content
------------------------------

Retrieve a list of published versions for a given Content.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "fab6644c-acf1-424b-8120-cd1ed2954f63",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:50.374547Z",
          "updated_at": "2022-05-18T11:49:01.520387Z",
          "content_set": "1c28bd1e-cfc2-4c58-9267-128607f35ab9",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "8d26a7d6-9d7c-4dca-bdaa-0b5e05944813",
          "content": {},
          "meta": null,
          "attributes": {
            "author-name": [
              "Antek",
              "Ala"
            ]
          },
          "has_extension": null,
          "extension": null,
          "created_at": "2022-02-18T14:02:07.706592Z",
          "updated_at": "2022-05-18T11:49:01.517971Z",
          "content_set": "63213797-d83c-43b8-a2ef-d66bbe69a925",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "512acf7b-a6ba-439c-8106-acd46ae6b021",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:53:00.082721Z",
          "updated_at": "2022-05-18T11:49:01.515461Z",
          "content_set": "49db5a4d-a379-4f1d-8cc4-3b545732d373",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        },
        {
          "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
          "content": {},
          "meta": {},
          "attributes": {},
          "has_extension": false,
          "extension": {},
          "created_at": "2022-02-18T13:52:16.996436Z",
          "updated_at": "2022-05-18T11:49:01.512557Z",
          "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
          "content_set_members": {
            "PL": {
              "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
              "routes": []
            }
          },
          "content_type": "blog-post",
          "language": "PL",
          "name": "Test",
          "routes": [],
          "access_rights": [4],
          "is_published": false,
          "is_up_to_date": false
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 6,
        "pages": 1,
        "records": 4
      },
      "content_type": "blog-post"
    }

**Parameters:**

- ``page``: number of page to be displayed
- ``limit``: number of objects to be displayed per page
- ``search``: (str) text search for searchable attributes
- ``order_by``: (str) order by comparable attribute
- ``<attribute_slug>``: (<attribute_type>) query by predefined attribute
- ``routes``: array of strings
- ``access_rights``: array of integers as a list of access rights
- ``created_at``: date formatted in ISO 8601 format
- ``created_at__gt``: (greater_than) date formatted in ISO 8601 format
- ``created_at__lt``: (lesser_than) date formatted in ISO 8601 format
- ``updated_at``: date formatted in ISO 8601 format
- ``updated_at__gt``: (greater_than) date formatted in ISO 8601 format
- ``updated_at__lt``: (lesser_than) date formatted in ISO 8601 format

**Address:**

- ``{{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/<uid>/published/``
- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender/<content_type_slug>/<uid>/published/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender/<content_type_slug>/<uid>/published/``

**Sample Requests:**

- ``curl -X GET {{<apiurl>}}api/contentdb/v1/content/<content_type_slug>/<uid>/published/``
- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``



POST Published for Content
--------------------------

Create a new published version for a given document.

**Field Descriptions:**

- ``content``: (json) valid JSON
- ``extension``: (json) valid JSON
- ``meta``: (json) valid JSON
- ``attributes``: (dict) object representing attributes, may include both single values and lists

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X POST {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``


DELETE Published for Content
----------------------------

Delete the most recent published version for a given document.

**Parameters:**

- ``all``: (bool) (optional) true if all published version should be deleted, default: false

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X DELETE {{<apiurl>}}api-admin/contentdb/v1/content/<content_type_slug>/<uid>/published/``


GET Draft for Published
-----------------------

Retrieve the draft corresponding to a specific publication.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "7f026b46-8564-4734-a42f-497e5b9d96f0",
        "content": {},
        "meta": {},
        "attributes": {},
        "has_extension": false,
        "extension": {},
        "created_at": "2022-02-18T13:52:16.996436Z",
        "updated_at": "2022-05-18T11:49:01.512557Z",
        "content_set": "2a7b849c-9153-4da4-bd99-f9ff960dee92",
        "content_set_members": {
          "PL": {
            "uid": "f3d5c24e-56b4-4810-a6dc-c5546db972c1",
            "routes": []
          }
        },
        "content_type": "blog-post",
        "language": "PL",
        "name": "Test",
        "routes": [],
        "access_rights": [4],
        "is_published": false,
        "is_up_to_date": false
      }
    }

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/<uid>/draft/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/published/<content_type_slug>/<uid>/draft/``


GET Content|Layout Sets
-----------------------

Retrieve a list of content sets.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "uid": "862c282b-fa25-4bc5-95de-28e037a7ad98",
          "members": [
            {
              "name": "",
              "draft": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
              "language": "PL"
            }
          ]
        },
        {
          "uid": "02a44b84-f412-4e5e-ba65-83d70bd1eef7",
          "members": []
        },
        {
          "uid": "e50792b6-dc59-48fc-ad0b-caa838ac175b",
          "members": []
        },
        {
          "uid": "6307c019-0339-4d07-a17d-4e0cdc1b7d49",
          "members": []
        },
        {
          "uid": "073aab91-eb6c-4976-b99f-2650914fe67a",
          "members": []
        },
        {
          "uid": "09c412da-ccd0-4a71-a2a0-3a7fc953af54",
          "members": []
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 6,
        "pages": 2,
        "records": 9
      }
    }

**Parameter Descriptions:**

- ``content_type``: content_type slug

**Address:**

- ``{{<apiurl>}}api/contentdb/v1/content-sets/``
- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender-sets/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content-sets/``

GET Content|Layout Set
-----------------------

Retrieve a single content set by UID.

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": {
        "uid": "862c282b-fa25-4bc5-95de-28e037a7ad98",
        "members": [
          {
            "name": "",
            "draft": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
            "language": "PL"
          }
        ]
      }
    }

**Address:**

- ``{{<apiurl>}}api/contentdb/v1/content-sets/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``
- ``{{<apiurl>}}api/contentdb/v1/layout-extender-sets/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/<uid>/``

**Sample Request:**

- ``curl -X GET {{<apiurl>}}api/contentdb/v1/content-sets/<uid>/``
- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``

===========================================
POST Content|Layout Set
===========================================

Create a new content set.

.. code-block:: json

    {
      "meta": {
        "status": "CREATED",
        "message": ""
      },
      "data": {
        "uid": "862c282b-fa25-4bc5-95de-28e037a7ad98",
        "members": [
          {
            "name": "",
            "draft": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
            "language": "PL"
          }
        ]
      }
    }

**Field Descriptions:**

- ``members``: list of objects like {"draft": <uid>}

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"members": [{"draft": "draft-uid-1"}, {"draft": "draft-uid-2"}]}' -X POST {{<apiurl>}}api-admin/contentdb/v1/content-sets/``

PUT Content Set
===============

Modify an existing content set.

.. code-block:: json

    {
      "meta": {
        "status": "UPDATED",
        "message": ""
      },
      "data": {
        "uid": "02a44b84-f412-4e5e-ba65-83d70bd1eef7",
        "members": [
          {
            "name": "",
            "draft": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
            "language": "PL"
          }
        ]
      }
    }

**Field Descriptions:**

- ``members``: list of objects like {"draft": <uid>}

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/<uid>/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"members": [{"draft": "draft-uid-1"}, {"draft": "draft-uid-2"}]}' -X PUT {{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``

PATCH Content Set
=================

Partially modify an existing content set (similar to PUT, but only specified fields need to be provided).

.. code-block:: json

    {
      "meta": {
        "status": "UPDATED",
        "message": ""
      },
      "data": {
        "uid": "02a44b84-f412-4e5e-ba65-83d70bd1eef7",
        "members": [
          {
            "name": "",
            "draft": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
            "language": "PL"
          },
          {
            "name": "",
            "draft": "new-draft-uid-here",
            "language": "EN"
          }
        ]
      }
    }

**Field Descriptions:**

- ``members``: list of objects like {"draft": <uid>}

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/<uid>/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"members": [{"draft": "draft-uid-1"}, {"draft": "draft-uid-2"}]}' -X PATCH {{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``

DELETE Content Set
==================

Delete a content set.

.. code-block:: json

    {
      "meta": {
        "status": "DELETED",
        "message": ""
      },
      "data": ""
    }

Response Code: ``204 No Content``

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``
- ``{{<apiurl>}}api-admin/contentdb/v1/layout-extender-sets/<uid>/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X DELETE {{<apiurl>}}api-admin/contentdb/v1/content-sets/<uid>/``

Edit Document Language (Draft)
================================

Language belongs to Draft, not Content Set. To change a document's language, update the draft.

PATCH Draft - Change Language
------------------------------

.. code-block:: javascript

    {
      "meta": {
        "status": "UPDATED",
        "message": ""
      },
      "data": {
        "uid": "848d3ea0-f339-45bf-b19e-dc22a7548afc",
        "content": {...},
        "language": "EN",
        "name": "Article title",
        "content_type": "article",
        ...
      }
    }

**Field Descriptions:**

- ``language``: ISO2 language code (PL, EN, DE, FR, etc.) or null

**Address:**

- ``{{<apiurl>}}api-admin/contentdb/v1/content/<content_type>/<draft_uid>/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{"language": "EN"}' -X PATCH {{<apiurl>}}api-admin/contentdb/v1/content/article/<draft_uid>/``

GET Languages - List Available Languages
-----------------------------------------

To see the list of available languages in the system:

.. code-block:: json

    {
      "meta": {
        "status": "OK",
        "message": ""
      },
      "data": [
        {
          "id": 1,
          "iso2": "PL",
          "iso3": "POL"
        },
        {
          "id": 2,
          "iso2": "EN",
          "iso3": "ENG"
        }
      ]
    }

**Address:**

- ``{{<apiurl>}}api/contentdb/v1/languages/``
- ``{{<apiurl>}}api-admin/contentdb/v1/languages/``

**Sample Request:**

- ``curl -H "Authorization: Bearer <access_token>" -X GET {{<apiurl>}}api/contentdb/v1/languages/``


Django ContentDB docAPI
=======================


cdn
