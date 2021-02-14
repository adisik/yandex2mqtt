# yandex2mqtt
Мост из Яндекс УД в MQTT на Node.js 

Форк [Проекта](https://github.com/munrexio/yandex2mqtt) и [Статья на Хабре](https://habr.com/ru/post/465537/) к оригиналу.

## Важно
Те, кто пользуется оригинальным проектом (или его форками), обратите внимание на то, что немного изменились настройки устройств (блок **devices** в файле конфигурации).

На данный момент проверено получение температуры и влажности с датчиков (датчики дверей и движения пока в бета-тесте), и включение/выключение света (вкл./выкл. других устройств по аналогии тоже должно работать).

Прочий функционал (изменение громкости, каналов, отключение звука), поидее, так же должны работать.

## ChangeLog
Проведён рефакторинг кода и, местами, внесены значительные правки.

Добавлена поддержка датчиков (устройств **devices.types.sensor**)

## Требования
- **"Белый" IP адрес и домен**. Если нет своего домена и белого IP адреса можно воспользоваться Dynamic DNS  сервисами (например, noip.com).
- **SSL сертификат _(самоподписанный сертификат не подойдёт)_**. Для получения сертификата можно воспользоваться [https://letsencrypt.org](https://letsencrypt.org).

## Установка
Настройка репозитория Node JS
```
curl -sL https://deb.nodesource.com/setup_10.x | bash -
```

Устанавка необходимых пакетов
```
apt-get install -y nodejs git make g++ gcc build-essential
```

Копирование файлов y2m с git
```
git clone https://github.com/lasthead0/yandex2mqtt.git /opt/yandex2mqtt
```

Установка прав на директорию
```
chown -R root:root /opt/yandex2mqtt
```

Установка необходимых модулей nodejs
```
cd /opt/yandex2mqtt
npm install
```

Запуск моста (выполняется после настройки)
```
npm start
```

## Настройка yandex2mqtt
Все основные настройки моста прописываются в файл config.js. Перед запуском обязательно отредактируйте его.
```
mv config.orig.js config.js
```

**Файл конфигурации**
```
module.exports = {
  mqtt: {
    ...
  },

  https: {
    ...
  },

  clients: [
    {
      ...
    },
  ],

  users: [
    {
      ...
    },
  ],

  devices: [
    {
      ...
    },
  ]
}
```

**Блок настройки mqtt клиента**
Указать данные Вашего MQTT сервера
```
mqtt: {
  host: 'localhost',
  port: 1883,
  user: 'user',
  password: 'password'
},
```

**Блок настройки https сервера**
Указать порт, на котором будет работать мост, а так же пути к сертификату ssl.
```
https: {
  privateKey: '/etc/letsencrypt/live/your.domain.ru/privkey.pem',
  certificate: '/etc/letsencrypt/live/your.domain.ru/fullchain.pem',
  port: 4433
},
```

**Блок настройки клиентов**
Здесь используются произвольные данные, далее они понадобятся для подключения к УД Yandex.
```
clients: [
  {
    id: '1',
    name: 'Yandex',
    clientId: 'client',
    clientSecret: 'secret',
    isTrusted: false
  },
],
```

**Блок настройки пользователей**
```
users: [
  {
    id: "1",
    username: "admin",
    password: "admin",
    name: "Administrator"
  },
  {
    id: "2",
    username: "user1",
    password: "user1",
    name: "User"
  },
],
```

**Блок настройки устройств**
```
devices: [
  {
    id: "lvr-003-switch",
    name: "Основной свет",
    room: "Гостиная",
    type: "devices.types.light",
    mqtt: [
      {
        instance: "on",
        set: "/yandex/controls/light_LvR_003/state/on",
        state: "/yandex/controls/light_LvR_003/state"
      },
    ],
    /* mapping значений между yandex и УД */
    valueMapping: [
      {
        type: "on_off",
        mapping: [[false, true], [0, 1]] // [yandex, mqtt]
      }
    ],
    capabilities: [
      {
        type: "devices.capabilities.on_off",
        retrievable: true,
      },
    ],
  }, 

  {
    id: "lvr-001-weather",
    name: "В гостиной",
    room: "Гостиная",
    type: "devices.types.sensor",
    mqtt: [
      {
        instance: "temperature",
        state: "/yandex/sensors/LvR_001_Weather/temperature"
      },
      {
        instance: "humidity",
        state: "/yandex/sensors/LvR_001_Weather/humidity"
      }
    ],
    properties: [
      {
        type: "devices.properties.float",
        retrievable: true,
        parameters: {
          instance: "temperature",
          unit: "unit.temperature.celsius"
        },
      },
      {
        type: "devices.properties.float",
        retrievable: true,
        parameters: {
          instance: "humidity",
          unit: "unit.percent"
        },
        /* Блок state указывать не обязательно */
        state: {
          instance: "humidity",
          value: 0
        }
      }
    ] 
  },
  /* --- end */
]
```
*Рекомендую указывать id в конфиге, чтобы исключить "наложение" новых устройств на "старые", которые уже добавлены в yandex.*

*В случае отсутсвия id в конфиге, он будет назначен автоматически по индексу в массиве.*

###### Mapping значений
Блок valueMapping позволяет настроить конвертацию значений между yandex api и MQTT. Это может быть актуально для умений типа **devices.capabilities.on_off** и **devices.capabilities.toggle**.

*Например, если в УД состояние влючено/выключено соответствует значениям 1/0, то Вам понадобиться их конвертировать, т.к. в навыках Yandex значения true/false.*
```
valueMapping: [
  {
    type: "on_off",
    mapping: [[false, true], [0, 1]] // [yandex, mqtt]
  }
]
```
В mapping указывается миссив массивов. Первый массив - значения в yandex, второй - в MQTT.

## Документация Яндекс
- [Типы устройств](https://yandex.ru/dev/dialogs/alice/doc/smart-home/concepts/device-types.html)
- [Типы умений устройства](https://yandex.ru/dev/dialogs/alice/doc/smart-home/concepts/capability-types.html)
- [Типы встроенных датчиков](https://yandex.ru/dev/dialogs/alice/doc/smart-home/concepts/properties-types.html)

## Создание службы
В папке  /etc/systemd/system/ создать файл yandex2mqtt.service со следующим содержанем:
```
[Unit]
Description=yandex2mqtt
After=network.target

[Service]
ExecStart=/usr/bin/npm start
WorkingDirectory=/opt/yandex2mqtt
StandardOutput=inherit
StandardError=inherit
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

Для включения службы использовать команду:
```
systemctl enable yandex2mqtt.service
```

Для управления службой использовать команды:
```
service yandex2mqtt start
```
```
service yandex2mqtt stop
```
```
service yandex2mqtt restart
```

## Создание навыка (в Яндекс Диалоги)

Заходим в [Яндекс Диалоги](https://dialogs.yandex.ru/developer) => Создать диалог => Умный дом

###### Основные настройки
- **Название** *Любое*
- **Backend** *Endpoint URL* и указываем https://your.domain.ru:port/provider
- **Тип доступа** *Приватный*

###### Публикация в каталоге
- **Подзаголовок** *Любой текст*
- **Имя разработчика** *Ваше имя*
- **Официальный навык** *Нет*
- **Описание** *Любой текст*
- **Иконка** *Своя иконка*

###### Связка аккаунтов
- **Авторизация** _Кнопка **"Создать"**_

###### Создание связки аккаунтов
- **Идентификатор приложения** *Файл конфигурации clients.clientId*
- **Секрет приложения** *Файл конфигурации clients.clientSecret*
- **URL авторизации** *https://your.domain.ru:port/dialog/authorize*
- **URL для получения токена** *https://your.domain.ru:port/oauth/token*
- **URL для обновления токена** *https://your.domain.ru:port/oauth/token*

**Сохраняем** навык. Далее можно работать с черновиком (тестировать навык) или опубликовать его (кнопка **"Опубликовать"**).

На вкладке **Тестирование** (далее кнопка **+(плюс)**) необходимо **Привязать к Яндексу** наш мост, используя имя пользователя и пароль из файла конфигурации (блок **users**). После этого можно получить список устройств.

## Известные "особенности поведения" ioBroker (iob)

###### Не изменяются и не читаются топики MQTT

Если случается такое, что Алиса получает голосовую команду и не сообщает об ошибке, но при этом топик не меняет своего значения или, при изменении стейта (объекта iob) MQTT топик не публикуется (Алиса не получает нового значения, а сообщает старое) **необходимо перезапустить адаптер mqtt**.

Аналогичная ситуация может возникнуть, если в качестве топика использовать объект iob созданный вручную. В данном случает адаптер mqtt не будет "знать", что данный объект является топиком mqtt.
Для исправления этой ошибки необходимо отредактировать объект iob: зайти в редактирование объекта и на вкладке **RAW (EXPERTS ONLY)** в json в поле **native** добавить **topic**. Пример:
```
"native": {
  "topic": "/yandex/controls/light_BdR_002/state"
}
```
**Перезапустить адаптер mqtt**