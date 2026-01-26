Testing self-closing iframe tags:

## Test 1: Self-closing iframe with srcdoc

<iframe width="100%" srcdoc="<!DOCTYPE html>
<html>
<head>
  <title>Test Chart</title>
</head>
<body>
  <h1>Self-Closing Iframe Test</h1>
  <script>
    // This is a test comment
    console.log('Hello from self-closing iframe');
    var data = [1, 2, 3, 4, 5];
    console.log(data);
  </script>
</body>
</html>" />

## Test 2: Regular iframe with closing tag

<iframe width="100%" srcdoc="<!DOCTYPE html>
<html>
<body>
  <h1>Regular Iframe</h1>
  <script>
    console.log('Regular iframe');
  </script>
</body>
</html>"></iframe>

## Test 3: Self-closing iframe with height attribute (should be removed)

<iframe width="100%" height="400px" srcdoc="<!DOCTYPE html>
<html>
<body>
  <p>This iframe has a height attribute that should be removed</p>
</body>
</html>" />

## Test 4: Multiple self-closing iframes

<iframe width="50%" srcdoc="<html><body><h2>First</h2></body></html>" />
<iframe width="50%" srcdoc="<html><body><h2>Second</h2></body></html>" />
