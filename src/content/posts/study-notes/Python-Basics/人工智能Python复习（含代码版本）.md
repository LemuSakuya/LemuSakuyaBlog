---
title: "人工智能Python复习（含代码版本）"
published: 2026-06-03
description: "《Python基础》学习笔记：人工智能Python复习（含代码版本）"
tags: [Study Notes, Python Basics]
category: "Python Basics"
draft: false
pinned: false
comment: true
---

### 人工智能Python复习（含代码版本）
### 第二章 Python序列
1. **列表操作**：
   - **创建列表**：
     ```python
     # 使用方括号
     a = [1, 2, 3, 4, 5]
     # 使用list()函数
     b = list((1, 2, 3, 4, 5))
     # 列表推导式
     c = [x * 2 for x in a]
     ```
   - **增删改查**：
     ```python
     a.append(6)  # 添加元素
     a.extend([7, 8])  # 扩展列表
     a.insert(0, 0)  # 在索引0处插入元素
     a.pop()  # 删除并返回最后一个元素
     a.remove(3)  # 删除指定元素
     del a[0]  # 删除索引0处的元素
     ```
   - **切片操作**：
     ```python
     b = a[1:4]  # 获取索引1到3的元素
     c = a[::2]  # 获取每隔一个元素
     ```
   - **排序**：
     ```python
     a.sort()  # 原地排序
     b = sorted(a)  # 返回新列表并排序
     ```
   - **成员判断**：
     ```python
     if 5 in a:
         print("5 is in the list")
     if 6 not in a:
         print("6 is not in the list")
     ```

2. **元组**：
   - **创建元组**：
     ```python
     # 使用圆括号
     t = (1, 2, 3, 4, 5)
     # 使用tuple()函数
     u = tuple([1, 2, 3, 4, 5])
     ```

3. **字典**：
   - **创建字典**：
     ```python
     # 使用花括号
     d = {'a': 1, 'b': 2, 'c': 3}
     # 使用dict()函数
     e = dict(a=1, b=2, c=3)
     # 使用fromkeys()方法
     f = dict.fromkeys(['a', 'b', 'c'], 0)
     ```
   - **操作字典**：
     ```python
     value = d.get('a')  # 获取键'a'的值
     d.update({'d': 4})  # 更新字典
     removed_value = d.pop('b')  # 删除并返回键'b'的值
     keys = d.keys()  # 获取所有键
     values = d.values()  # 获取所有值
     items = d.items()  # 获取所有键值对
     ```

4. **集合**：
   - **创建集合**：
     ```python
     # 使用花括号
     s = {1, 2, 3, 4, 5}
     # 使用set()函数
     t = set([1, 2, 3, 4, 5])
     ```
   - **集合运算**：
     ```python
     s1 = {1, 2, 3}
     s2 = {3, 4, 5}
     union = s1 | s2  # 并集
     intersection = s1 & s2  # 交集
     difference = s1 - s2  # 差集
     symmetric_difference = s1 ^ s2  # 对称差集
     ```

### 第三章 选择与循环
1. **条件表达式**：
   ```python
   x = 10
   if x > 0:
       print("x is positive")
   elif x == 0:
       print("x is zero")
   else:
       print("x is negative")
   ```

2. **循环结构**：
   - **for循环**：
     ```python
     for i in range(5):
         print(i)
     else:
         print("Loop completed")
     ```
   - **while循环**：
     ```python
     i = 0
     while i < 5:
         print(i)
         i += 1
     else:
         print("Loop completed")
     ```
   - **循环控制**：
     ```python
     for i in range(10):
         if i == 5:
             break  # 跳出循环
         if i % 2 == 0:
             continue  # 跳过偶数
         print(i)
     ```

### 第四章 字符串与正则表达式
1. **字符串操作**：
   - **格式化**：
     ```python
     name = "Alice"
     age = 30
     message = f"Hello, {name}. You are {age} years old."
     print(message)
     ```
   - **常用方法**：
     ```python
     s = "Hello, World!"
     split_s = s.split(", ")  # 按逗号和空格分割
     join_s = ", ".join(split_s)  # 用逗号和空格连接
     replace_s = s.replace("World", "Python")  # 替换字符串
     find_index = s.find("World")  # 查找子字符串的索引
     ```

2. **正则表达式**：
   ```python
   import re
   
   text = "The rain in Spain"
   # 查找所有匹配的子字符串
   findall_result = re.findall(r"\bS\w+", text)
   print(findall_result)  # 输出: ['Spain']
   # 查找第一个匹配的子字符串
   search_result = re.search(r"\bS\w+", text)
   print(search_result.group())  # 输出: Spain
   # 匹配整个字符串
   match_result = re.match(r"\bT\w+", text)
   if match_result:
       print(match_result.group())  # 输出: The
   # 替换子字符串
   sub_result = re.sub(r"\bS\w+", "Country", text)
   print(sub_result)  # 输出: The rain in Country
   # 分割字符串
   split_result = re.split(r"\s+", text)
   print(split_result)  # 输出: ['The', 'rain', 'in', 'Spain']
   ```

### 第五章 函数的设计和使用
1. **函数定义与参数**：
   - **位置参数、默认值参数、关键字参数**：
     ```python
     def greet(name, greeting="Hello"):
         print(f"{greeting}, {name}!")
     
     greet("Alice")  # 输出: Hello, Alice!
     greet("Bob", greeting="Hi")  # 输出: Hi, Bob!
     ```
   - **可变长度参数**：
     ```python
     def sum_all(*args):
         return sum(args)
     
     print(sum_all(1, 2, 3, 4, 5))  # 输出: 15
     ```
   - **参数解包**：
     ```python
     def print_args(a, b, c):
         print(a, b, c)
     
     args = (1, 2, 3)
     print_args(*args)  # 输出: 1 2 3
     
     kwargs = {'a': 1, 'b': 2, 'c': 3}
     print_args(**kwargs)  # 输出: 1 2 3
     ```

2. **作用域**：
   ```python
   x = 10  # 全局变量
   
   def modify_x():
       global x
       x += 5
   
   modify_x()
   print(x)  # 输出: 15
   ```

3. **lambda表达式**：
   ```python
   add_one = lambda x: x + 1
   print(add_one(5))  # 输出: 6
   ```

### 第六章 面向对象程序设计
1. **类与对象**：
   ```python
   class Animal:
       def __init__(self, name):
           self.name = name
   
       def speak(self):
           print(f"{self.name} makes a sound")
   
   class Dog(Animal):
       def __init__(self, name, breed):
           super().__init__(name)
           self.breed = breed
   
       def speak(self):
           print(f"{self.name} barks")
   
   dog = Dog("Buddy", "Golden Retriever")
   dog.speak()  # 输出: Buddy barks
   ```

2. **成员与访问控制**：
   ```python
   class MyClass:
       def __init__(self):
           self.public_var = 10
           self._protected_var = 20
           self.__private_var = 30  # 私有变量
   
       @property
       def private_var(self):
           return self.__private_var
   
   obj = MyClass()
   print(obj.public_var)  # 输出: 10
   print(obj._protected_var)  # 输出: 20
   print(obj.private_var)  # 输出: 30（通过property访问）
   ```

3. **方法类型**：
   ```python
   class MyClass:
       class_var = "I am a class variable"
   
       def instance_method(self):
           print(f"Instance method: {self.class_var}")
   
       @classmethod
       def class_method(cls):
           print(f"Class method: {cls.class_var}")
   
       @staticmethod
       def static_method():
           print("Static method")
   
   obj = MyClass()
   obj.instance_method()  # 输出: Instance method: I am a class variable
   MyClass.class_method()  # 输出: Class method: I am a class variable
   MyClass.static_method()  # 输出: Static method
   ```

4. **继承与多态**：
   ```python
   class Animal:
       def speak(self):
           print("Some generic sound")
   
   class Dog(Animal):
       def speak(self):
           super().speak()  # 调用父类方法
           print("Woof!")
   
   class Cat(Animal):
       def speak(self):
           super().speak()  # 调用父类方法
           print("Meow!")
   
   def animal_sound(animal):
       animal.speak()
   
   dog = Dog()
   cat = Cat()
   
   animal_sound(dog)  # 输出: Some generic sound
                      #        Woof!
   animal_sound(cat)  # 输出: Some generic sound
                      #        Meow!
   ```

### 第七章 文件操作
1. **文件操作**：
   - **打开模式**：
     ```python
     with open('example.txt', 'w') as f:
         f.write("Hello, World!")
     
     with open('example.txt', 'r') as f:
         content = f.read()
         print(content)  # 输出: Hello, World!
     ```
   - **读写方法**：
     ```python
     with open('example.txt', 'w') as f:
         f.writelines(["Line 1\n", "Line 2\n", "Line 3\n"])
     
     with open('example.txt', 'r') as f:
         lines = f.readlines()
         print(lines)  # 输出: ['Line 1\n', 'Line 2\n', 'Line 3\n']
     ```
   - xxxxxxxxxx import re​text = "Call me at 123-456-7890 or 987.654.3210"pattern = r"\b\d{3}[-.]\d{3}[-.]\d{4}\b"matches = re.findall(pattern, text)print(matches)  # 输出: ['123-456-7890', '987.654.3210']python
     ```python
     with open('example.txt', 'r+') as f:
         print(f.read(5))  # 输出: Line 1
         f.seek(0)  # 移动到文件开头
         print(f.read(5))  # 输出: Line 1
     ```

### 第八章 异常处理结构与程序调试
1. **异常处理**：
   - **try-except**：
     ```python
     try:
         result = 10 / 0
     except ZeroDivisionError as e:
         print(f"Error: {e}")
     ```
   - **try-except-else**：
     ```python
     try:
         result = 10 / 2
     except ZeroDivisionError as e:
         print(f"Error: {e}")
     else:
         print(f"Result is {result}")  # 输出: Result is 5.0
     ```
   - **try-finally**：
     ```python
     try:
         result = 10 / 0
     except ZeroDivisionError as e:
         print(f"Error: {e}")
     finally:
         print("This will always execute")
     ```

### 第九章 GUI编程
1. **tkinter基础**：
   ```python
   import tkinter as tk
   
   def on_button_click():
       print("Button was clicked!")
   
   root = tk.Tk()
   root.title("Tkinter Example")
   
   label = tk.Label(root, text="Hello, World!")
   label.pack()
   
   button = tk.Button(root, text="Click Me", command=on_button_click)
   button.pack()
   
   entry = tk.Entry(root)
   entry.pack()
   
   root.mainloop()
   ```

### 第十章 网络程序设计
1. **socket编程**：
   - **服务器端**：
     ```python
     import socket
     
     server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
     server_socket.bind(('localhost', 8080))
     server_socket.listen(5)
     
     print("Server is listening on port 8080")
     
     while True:
         client_socket, addr = server_socket.accept()
         print(f"Connection from {addr} has been established")
         client_socket.send(b"Welcome to the server!")
         client_socket.close()
     ```
   - **客户端**：
     ```python
     import socket
     
     client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
     client_socket.connect(('localhost', 8080))
     
     message = client_socket.recv(1024)
     print(message.decode())  # 输出: Welcome to the server!
     
     client_socket.close()
     ```

### 第十三章 多线程与多进程编程
1. **多线程**：
   ```python
   import threading
   
   def print_numbers():
       for i in range(5):
           print(i)
   
   def print_letters():
       for letter in 'abcde':
           print(letter)
   
   thread1 = threading.Thread(target=print_numbers)
   thread2 = threading.Thread(target=print_letters)
   
   thread1.start()
   thread2.start()
   
   thread1.join()
   thread2.join()
   ```

2. **多进程**：
   ```python
   from multiprocessing import Process, Queue
   
   def worker(q):
       q.put("Hello from the worker process")
   
   q = Queue()
   p = Process(target=worker, args=(q,))
   p.start()
   
   message = q.get()
   print(message)  # 输出: Hello from the worker process
   
   p.join()
   ```