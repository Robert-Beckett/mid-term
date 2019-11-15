//helpers function

const order = function(food,order) {
  if (order.length === 0) {
    order.push(food);
  } else {
    let checkItem = true;
    order.forEach(item => {
      if (item["name"] === food["name"]) {
        item["quantity"] += 1;
        checkItem = false;
        return;
      } 
    })  
    if (checkItem) {order.push(food);}
  }
  return order;
}

//Add items to order cart

const orderSum = () => {
  const template = `
  
  <table class="user-order1">
    <tr>
      <td class="user-order-name"></td>
      <td class="user-order-quantity"></a>
      <td class="user-order-price"></td>
      <td>
        <button class="user-item-add" type="button"><img src="/resources/plus-circle.png"></button>
      </td>

    </tr>
    <tr class="user-order-subtotal"></tr>
    <tr class="user-order-tax"></tr>
    <tr class="user-order-total"></tr>
  </table>
  <footer class="order-total"><p>Subtotal: </p></footer>
  <input class="user-order-submit" type="submit" value="Place Order"></input>
  `;
  
  const tax = 0.05;
  let yourOrder = [];
  

  $(".user-item-add").on('click', function(event) {
    let subTotal = 0;
    event.preventDefault();
    $(".user-order1").detach();
    
    let $foodName = {};
    $foodName["name"] = $(this).closest('tr').find(".user-item-name").text();
    order($foodName, yourOrder);
    $foodName["quantity"] = 1;
    $foodName["price"] = $(this).closest('tr').find(".user-item-price").text() / 100;
    
    for (let order of yourOrder) {
      
      const $temp = $(template);
      $temp.find(".user-order-name").append(order["name"]);
      $temp.find(".user-order-quantity").append(order["quantity"]);
      $temp.find(".user-order-price").append(order["price"] * order["quantity"]);
      subTotal += order["price"] * order["quantity"];
      $(".order-total").detach();
      $(".user-order-submit").detach();
      $(".user-order").append($temp);
    }

    $(".order-total").text(subTotal);

    

  })

}


//-------------------------------------------------
//menu display - pull data from database
$(() => {

  //template for menu
  const template = `
  <table class="user-menu-table">
    <tr>
      <td>
        <a class="user-item-name">name</a>
        <a class="user-item-description">description</a>
      </td>
      <td class="user-item-price">$</td>
      <td>
        <button class="user-item-add" type="button"><img src="/resources/plus-circle.png"></button>
      </td>
    </tr>
  </table>
  `;

//get data from GET /menu
//loop through data and render to table

  $(".user-order-now").on('click', ((event) => {
    event.preventDefault();
    $.ajax("user/menu", {
      method: 'GET',
      dataType: "json",
    }).done((data) => {
      $.each(data, (index) => {
        const $temp = $(template);
        $temp.find(".user-item-name").text(data[index].name);
        $temp.find(".user-item-description").text(data[index].description);
        $temp.find(".user-item-price").text(data[index].cost);
        $(".user-menu").append($temp);
      })
      
      orderSum();
    })  
  }))
  

})