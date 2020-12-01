<script>
    import Header from "../../Layout/Header.svelte";
    import Aside from "../../Layout/Aside.svelte";
    import { link } from "svelte-spa-router";
</script>

<Aside />

<main class="admin-main">
  <Header />
  <section class="admin-content p-2">
    <div class="p-2">
      <div class="row" />
      <h4 class="mt-2">Interconsultas</h4>
        <div class="row">
            <div class="col-md-12">
                <div class="row">
                    <div class="col-md-5">
                        <div class="input-group input-group-flush mb-3">
                            <input type="search" class="form-control form-control-appended" placeholder="Buscar">
                            <div class="input-group-append">
                                <div class="input-group-text">
                                    <span class="mdi mdi-magnify"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-12 m-b-30">
                <div class="table-responsive">
                    <table class="table align-td-middle table-card">
                        <thead>
                            <tr>
                                <th>Nombres</th>
                                <th>Edad</th>
                                <th>Sexo</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: pacientes">
                            <tr>
                                <td>
                                    <div class="avatar avatar-sm mr-2 d-block-sm">
                                        <div class="avatar avatar-sm">
                                            <span class="avatar-title rounded-circle ">FD</span>
                                        </div>
    
                                    </div> <span>Fiordaliza De Jesus</span>
                                </td>
                                <td>49 años</td>
                                <td>Femenino</td>
    
                                <td style="text-align: right;">
                                    <div style="width: 200px;" class="ml-auto">
                                        <a href="/Paciente/Editar" use:link data-toggle="tooltip" data-placement="top" data-original-title="Modificar paciente" class="btn btn-outline-secondary btn-sm">VER INTERCONSULTA</a>    
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
    
                </div>
            </div>
        </div>
    </div>
  </section>
</main>